const serverless = require("serverless-http");
const app = require("../backend/server");

// This catch-all API endpoint lets Vercel route any /api/* request to the Express app.
module.exports = serverless(app);
