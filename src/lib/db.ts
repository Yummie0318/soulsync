// src/lib/db.ts
import pkg from "pg";
import type { Pool as PoolType } from "pg";
const { Pool } = pkg;

declare global {
  var __pgPool: PoolType | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL is not set. Database connections will fail!");
} else {
  console.log("✅ DATABASE_URL detected:", connectionString.slice(0, 30) + "..."); // log first part
}

const pool =
  global.__pgPool ??
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // required by Neon
  });

if (process.env.NODE_ENV !== "production") {
  global.__pgPool = pool;
}

export default pool;
