# Agritech

AgriTech is a MongoDB-backed agricultural analysis dashboard.

## MongoDB setup

1. Create a MongoDB Atlas cluster/database user and allow your deployment's network access.
2. Copy `.env.example` to `.env`, then set `MONGODB_URI`.
3. Import the included PostgreSQL dump directly into MongoDB:

   ```bash
   npm run migrate:mongo
   ```

   This creates indexed `production`, `states`, `crops`, `districts`, and `seasons` collections. Production documents contain their state and crop names, so dashboard queries do not need joins. Re-running the importer replaces agricultural data but retains registered users.

4. In Vercel Project Settings → Environment Variables, add `MONGODB_URI` and optionally `MONGODB_DB`, then deploy.
