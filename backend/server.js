const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const USERS_FILE = path.join(__dirname, "data", "users.json");

// Middlewares
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/landing.html"));
});
app.use(express.static(path.join(__dirname, "../public")));

// DATABASE CONNECTION
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

// Test DB connection
pool.connect()
  .then(() => console.log("Database connected successfully ✅"))
  .catch(err => console.error("Database connection error ❌", err));

async function ensureUsersFile() {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });

  try {
    await fs.access(USERS_FILE);
  } catch (error) {
    await fs.writeFile(USERS_FILE, "[]", "utf8");
  }
}

async function readUsers() {
  await ensureUsersFile();
  const fileContent = await fs.readFile(USERS_FILE, "utf8");

  try {
    const users = JSON.parse(fileContent);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    return [];
  }
}

async function writeUsers(users) {
  await ensureUsersFile();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, passwordHash };
}

function verifyPassword(password, salt, passwordHash) {
  const hashedAttempt = crypto.scryptSync(password, salt, 64).toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hashedAttempt, "hex"),
    Buffer.from(passwordHash, "hex")
  );
}

/* ===================== API ROUTES ===================== */

// Auth Signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const users = await readUsers();
    const existingUser = users.find((user) => user.email === email);

    if (existingUser) {
      return res.status(409).json({ error: "This email is already registered. Please log in instead." });
    }

    const { salt, passwordHash } = hashPassword(password);
    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      salt,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await writeUsers(users);

    res.status(201).json({
      message: "Sign up successful.",
      user: {
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to sign up right now." });
  }
});

// Auth Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const users = await readUsers();
    const existingUser = users.find((user) => user.email === email);

    if (!existingUser) {
      return res.status(404).json({ error: "No account found. Please sign up first." });
    }

    if (!verifyPassword(password, existingUser.salt, existingUser.passwordHash)) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    res.json({
      message: "Login successful.",
      user: {
        name: existingUser.name,
        email: existingUser.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to log in right now." });
  }
});

// Top States
app.get("/api/top-states", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.state_name,
             SUM(p.production_tonnes) AS total_production
      FROM production p
      JOIN district d ON p.district_id = d.district_id
      JOIN state s ON d.state_id = s.state_id
      GROUP BY s.state_name
      ORDER BY total_production DESC
      LIMIT 10
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Year Trend
app.get("/api/year-trend", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT year,
             SUM(production_tonnes) AS total_production
      FROM production
      GROUP BY year
      ORDER BY year
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// State Comparison
app.get("/api/state-comparison", async (req, res) => {
  try {
    const { states, crop, year } = req.query;

    if (!states || !crop || !year) {
      return res.status(400).json({ error: "Missing query parameters" });
    }

    const stateArray = states
      .split(",")
      .map((state) => state.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " "))
      .filter(Boolean);

    const normalizedCrop = crop.trim().toLowerCase();
    const normalizedYear = year.trim();
    const yearPrefix = /^\d{4}$/.test(normalizedYear) ? `${normalizedYear}-%` : `${normalizedYear}%`;

    const result = await pool.query(`
      SELECT s.state_name,
             SUM(p.production_tonnes) AS total_production,
             SUM(p.area_hectare) AS total_area,
             AVG(p.yield) AS avg_yield
      FROM production p
      JOIN district d ON p.district_id = d.district_id
      JOIN state s ON d.state_id = s.state_id
      JOIN crop c ON p.crop_id = c.crop_id
      WHERE REPLACE(LOWER(s.state_name), '_', ' ') = ANY($1)
      AND LOWER(c.crop_name) = $2
      AND p.year LIKE $3
      GROUP BY s.state_name
      ORDER BY total_production DESC
    `, [stateArray, normalizedCrop, yearPrefix]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// States
app.get("/api/states", async (req, res) => {
  try {
    const result = await pool.query("SELECT state_name FROM state ORDER BY state_name");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crops
app.get("/api/crops", async (req, res) => {
  try {
    const result = await pool.query("SELECT crop_name FROM crop ORDER BY crop_name");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Years
app.get("/api/years", async (req, res) => {
  try {
    const result = await pool.query("SELECT DISTINCT year FROM production ORDER BY year");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crop Analysis
app.get("/api/crop-analysis", async (req, res) => {
  try {
    const { crop, year } = req.query;

    if (!crop || !year) {
      return res.status(400).json({ error: "Missing query parameters" });
    }

    const normalizedCrop = crop.trim().toLowerCase();
    const normalizedYear = year.trim();
    const yearPrefix = /^\d{4}$/.test(normalizedYear) ? `${normalizedYear}-%` : `${normalizedYear}%`;

    const result = await pool.query(`
      SELECT s.state_name,
             SUM(p.production_tonnes) AS total_production,
             SUM(p.area_hectare) AS total_area,
             AVG(p.yield) AS avg_yield
      FROM production p
      JOIN district d ON p.district_id = d.district_id
      JOIN state s ON d.state_id = s.state_id
      JOIN crop c ON p.crop_id = c.crop_id
      WHERE LOWER(c.crop_name) = $1
      AND p.year LIKE $2
      GROUP BY s.state_name
      ORDER BY total_production DESC
      LIMIT 10
    `, [normalizedCrop, yearPrefix]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ===================== SERVER ===================== */

if (require.main === module) {
  // When running locally (e.g., `node backend/server.js`), start the server.
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} 🚀`);
  });
}

// Export the Express app so Vercel (and other serverless platforms) can wrap it.
module.exports = app;
