const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB || "agritech";
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../public/landing.html")));
app.use(express.static(path.join(__dirname, "../public")));

let mongoClientPromise;
function getDb() {
  if (!mongoUri) throw new Error("MONGODB_URI is not configured.");
  if (!mongoClientPromise) {
    const client = new MongoClient(mongoUri, { maxPoolSize: 10 });
    mongoClientPromise = client.connect().then((connected) => {
      console.log("MongoDB connected successfully");
      return connected;
    }).catch((error) => { mongoClientPromise = undefined; throw error; });
  }
  return mongoClientPromise.then((client) => client.db(mongoDbName));
}
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizedName = (value) => String(value || "").trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, passwordHash: crypto.scryptSync(password, salt, 64).toString("hex") };
}
function verifyPassword(password, salt, passwordHash) {
  return crypto.timingSafeEqual(Buffer.from(crypto.scryptSync(password, salt, 64).toString("hex"), "hex"), Buffer.from(passwordHash, "hex"));
}
function yearPattern(value) {
  const year = String(value || "").trim();
  return new RegExp("^(?:" + year.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&") + ")" + (/^\d{4}$/.test(year) ? "-" : ""));
}
async function analysisByState(match, limit) {
  const pipeline = [
    { $match: match },
    { $group: { _id: "$state_name", total_production: { $sum: "$production_tonnes" }, total_area: { $sum: "$area_hectare" }, avg_yield: { $avg: "$yield" } } },
    { $sort: { total_production: -1 } },
    { $project: { _id: 0, state_name: "$_id", total_production: 1, total_area: 1, avg_yield: 1 } }
  ];
  if (limit) pipeline.splice(-1, 0, { $limit: limit });
  return (await getDb()).collection("production").aggregate(pipeline).toArray();
}

app.post("/api/auth/signup", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    if (!name || !email || !password) return res.status(400).json({ error: "Name, email, and password are required." });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters long." });
    const { salt, passwordHash } = hashPassword(password);
    await (await getDb()).collection("users").insertOne({ id: crypto.randomUUID(), name, email, salt, passwordHash, createdAt: new Date() });
    res.status(201).json({ message: "Sign up successful.", user: { name, email } });
  } catch (error) {
    if (error && error.code === 11000) return res.status(409).json({ error: "This email is already registered. Please log in instead." });
    console.error(error); res.status(500).json({ error: "Unable to sign up right now." });
  }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email), password = String(req.body.password || "");
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const user = await (await getDb()).collection("users").findOne({ email });
    if (!user) return res.status(404).json({ error: "No account found. Please sign up first." });
    if (!verifyPassword(password, user.salt, user.passwordHash)) return res.status(401).json({ error: "Incorrect password. Please try again." });
    res.json({ message: "Login successful.", user: { name: user.name, email: user.email } });
  } catch (error) { console.error(error); res.status(500).json({ error: "Unable to log in right now." }); }
});
app.get("/api/top-states", async (req, res) => {
  try { res.json((await analysisByState({}, 10)).map(({ state_name, total_production }) => ({ state_name, total_production }))); }
  catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
});
app.get("/api/year-trend", async (req, res) => {
  try {
    res.json(await (await getDb()).collection("production").aggregate([
      { $group: { _id: "$year", total_production: { $sum: "$production_tonnes" } } },
      { $sort: { _id: 1 } }, { $project: { _id: 0, year: "$_id", total_production: 1 } }
    ]).toArray());
  } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
});
app.get("/api/state-comparison", async (req, res) => {
  try {
    const { states, crop, year } = req.query;
    if (!states || !crop || !year) return res.status(400).json({ error: "Missing query parameters" });
    res.json(await analysisByState({ normalized_state_name: { $in: String(states).split(",").map(normalizedName).filter(Boolean) }, normalized_crop_name: normalizedName(crop), year: yearPattern(year) }));
  } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
});
app.get("/api/states", async (req, res) => {
  try { res.json(await (await getDb()).collection("states").find({}, { projection: { _id: 0, state_name: 1 } }).sort({ state_name: 1 }).toArray()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
app.get("/api/crops", async (req, res) => {
  try { res.json(await (await getDb()).collection("crops").find({}, { projection: { _id: 0, crop_name: 1 } }).sort({ crop_name: 1 }).toArray()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
app.get("/api/years", async (req, res) => {
  try { res.json((await (await getDb()).collection("production").distinct("year")).sort().map((year) => ({ year }))); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
app.get("/api/crop-analysis", async (req, res) => {
  try {
    const { crop, year } = req.query;
    if (!crop || !year) return res.status(400).json({ error: "Missing query parameters" });
    res.json(await analysisByState({ normalized_crop_name: normalizedName(crop), year: yearPattern(year) }, 10));
  } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
});

const yieldOptions = {
  Region: ["North", "East", "South", "West"],
  Soil_Type: ["Clay", "Sandy", "Loam", "Silt", "Peaty", "Chalky"],
  Crop: ["Wheat", "Rice", "Maize", "Barley", "Soybean", "Cotton"],
  Weather_Condition: ["Sunny", "Rainy", "Cloudy"],
  Fertilizer_Used: [true, false],
  Irrigation_Used: [true, false]
};
app.get("/api/yield-analyzer/options", (req, res) => res.json(yieldOptions));

app.post("/api/yield-analyzer/predict", (req, res) => {
  const data = req.body || {};
  const required = ["Region", "Soil_Type", "Crop", "Rainfall_mm", "Temperature_Celsius", "Fertilizer_Used", "Irrigation_Used", "Weather_Condition", "Days_to_Harvest"];
  if (required.some((key) => data[key] === undefined || data[key] === null || data[key] === "")) {
    return res.status(400).json({ error: "Please select a value for every yield factor." });
  }
  if (!yieldOptions.Region.includes(data.Region) || !yieldOptions.Soil_Type.includes(data.Soil_Type) ||
      !yieldOptions.Crop.includes(data.Crop) || !yieldOptions.Weather_Condition.includes(data.Weather_Condition)) {
    return res.status(400).json({ error: "One or more selected categories are not supported by the trained model." });
  }
  for (const field of ["Rainfall_mm", "Temperature_Celsius", "Days_to_Harvest"]) {
    if (!Number.isFinite(Number(data[field]))) return res.status(400).json({ error: `${field} must be a valid number.` });
  }

  const python = process.env.PYTHON_PATH || "python";
  const child = spawn(python, [path.join(__dirname, "yield_predictor.py")], { windowsHide: true });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", (error) => res.status(500).json({ error: `Prediction service could not start: ${error.message}` }));
  child.on("close", (code) => {
    if (code !== 0) {
      console.error("Yield predictor error:", stderr);
      return res.status(500).json({ error: "The saved yield model could not generate a prediction." });
    }
    try { res.json(JSON.parse(stdout)); }
    catch (error) { console.error("Yield predictor response:", stdout, stderr); res.status(500).json({ error: "The prediction response was invalid." }); }
  });
  child.stdin.end(JSON.stringify(data));
});
if (require.main === module) app.listen(PORT, () => console.log("Server running on http://localhost:" + PORT));
module.exports = app;
