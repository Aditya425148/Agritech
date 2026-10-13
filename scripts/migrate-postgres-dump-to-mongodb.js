/* One-time importer: reads PostgreSQL COPY blocks, so PostgreSQL need not run. */
const fs = require("fs");
const readline = require("readline");
const path = require("path");
const { MongoClient } = require("mongodb");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB || "agritech";
if (!uri) throw new Error("MONGODB_URI is required. Add it to .env before importing.");
const fields = {
  crop: ["crop_id", "crop_name"], state: ["state_id", "state_name"],
  district: ["district_id", "district_name", "state_id"], season: ["season_id", "season_name"],
  production: ["production_id", "district_id", "crop_id", "season_id", "year", "area_hectare", "production_tonnes", "yield"]
};
const numeric = new Set(["crop_id", "state_id", "district_id", "season_id", "production_id", "area_hectare", "production_tonnes", "yield"]);
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
function readRow(table, line) {
  const values = line.split("\t");
  return Object.fromEntries(fields[table].map((field, index) => {
    const value = values[index] === "\\N" ? null : values[index];
    return [field, value === null ? null : numeric.has(field) ? Number(value) : value];
  }));
}
async function main() {
  const dump = path.join(__dirname, "../agritech.sql");
  if (!fs.existsSync(dump)) throw new Error("Dump not found: " + dump);
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(databaseName);
  const lookup = { crops: new Map(), states: new Map(), districts: new Map(), seasons: new Map() };
  await Promise.all(["crops", "states", "districts", "seasons", "production"].map((name) => db.collection(name).deleteMany({})));
  let table, count = 0, batch = [];
  const flush = async () => {
    if (batch.length) await db.collection("production").bulkWrite(batch.splice(0), { ordered: false });
  };
  const lines = readline.createInterface({ input: fs.createReadStream(dump), crlfDelay: Infinity });
  for await (const line of lines) {
    const copy = line.match(/^COPY public\.(crop|state|district|season|production) \(/);
    if (copy) { table = copy[1]; continue; }
    if (!table) continue;
    if (line === "\\.") { table = undefined; continue; }
    const row = readRow(table, line);
    if (table === "crop") lookup.crops.set(row.crop_id, row.crop_name);
    else if (table === "state") lookup.states.set(row.state_id, row.state_name);
    else if (table === "district") lookup.districts.set(row.district_id, row);
    else if (table === "season") lookup.seasons.set(row.season_id, row.season_name);
    else {
      const district = lookup.districts.get(row.district_id);
      const state_name = lookup.states.get(district && district.state_id);
      const crop_name = lookup.crops.get(row.crop_id);
      batch.push({ insertOne: { document: { ...row, district_name: district && district.district_name, state_name, crop_name, season_name: lookup.seasons.get(row.season_id), normalized_state_name: normalize(state_name), normalized_crop_name: normalize(crop_name) } } });
      count += 1;
      if (batch.length === 1000) await flush();
    }
  }
  await flush();
  // The dump lists states after production. Enrich production rows only once all
  // lookup tables have been read, without holding 383k rows in memory.
  const production = db.collection("production");
  const cursor = production.find({}, { projection: { _id: 1, district_id: 1, crop_id: 1 } }).batchSize(1000);
  let updates = [];
  for await (const item of cursor) {
    const district = lookup.districts.get(item.district_id);
    const state_name = lookup.states.get(district && district.state_id);
    const crop_name = lookup.crops.get(item.crop_id);
    updates.push({ updateOne: { filter: { _id: item._id }, update: { $set: { district_name: district && district.district_name, state_name, crop_name, normalized_state_name: normalize(state_name), normalized_crop_name: normalize(crop_name) } } } });
    if (updates.length === 1000) {
      await production.bulkWrite(updates, { ordered: false });
      updates = [];
    }
  }
  if (updates.length) await production.bulkWrite(updates, { ordered: false });
  await Promise.all([
    db.collection("crops").insertMany([...lookup.crops].map(([crop_id, crop_name]) => ({ crop_id, crop_name }))),
    db.collection("states").insertMany([...lookup.states].map(([state_id, state_name]) => ({ state_id, state_name }))),
    db.collection("districts").insertMany([...lookup.districts.values()]),
    db.collection("seasons").insertMany([...lookup.seasons].map(([season_id, season_name]) => ({ season_id, season_name })))
  ]);
  // Existing local accounts used a JSON file. Preserve those credentials too,
  // so users are not lost when moving the backend to a serverless deployment.
  const usersFile = path.join(__dirname, "../backend/data/users.json");
  if (fs.existsSync(usersFile)) {
    const users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    if (Array.isArray(users) && users.length) {
      await db.collection("users").bulkWrite(users
        .filter((user) => user && user.email)
        .map((user) => ({ updateOne: { filter: { email: String(user.email).toLowerCase() }, update: { $setOnInsert: { ...user, email: String(user.email).toLowerCase() } }, upsert: true } })));
    }
  }
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    production.createIndex({ normalized_crop_name: 1, year: 1, normalized_state_name: 1 }),
    db.collection("production").createIndex({ year: 1 })
  ]);
  console.log("Imported " + count + " production records into " + databaseName + ".");
  await client.close();
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
