// src/lib/db.ts
import pkg from "pg";
import type { Pool as PoolType } from "pg";
const { Pool } = pkg;

declare global {
  // allow global caching of the pool
  var __pgPool: PoolType | undefined;
}

if (!process.env.DATABASE_URL) {
  console.error(
    "❌ DATABASE_URL is not set. Database connections will fail!"
  );
}

const pool =
  global.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // required by Neon
  });

// Cache pool in dev mode to avoid multiple connections
if (process.env.NODE_ENV !== "production") {
  global.__pgPool = pool;
}

// Log a test query to confirm connection
(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Successfully connected to DB at:", res.rows[0].now);
  } catch (err) {
    console.error("❌ Failed to connect to DB:", err);
  }
})();

export default pool;
