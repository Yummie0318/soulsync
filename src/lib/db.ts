// src/lib/db.ts
import pkg from "pg";
import type { Pool as PoolType } from "pg"; // ✅ import only type
const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env");
}

declare global {
  var __pgPool: PoolType | undefined; // ✅ use type here
}

const pool =
  global.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // required by Neon
  });

if (process.env.NODE_ENV !== "production") {
  global.__pgPool = pool; // cache in dev to avoid creating multiple pools
}

export default pool;
