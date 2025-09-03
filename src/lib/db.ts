// src/lib/db.ts
import pkg from "pg";
import type { Pool as PoolType } from "pg";
const { Pool } = pkg;

declare global {
  var __pgPool: PoolType | undefined;
}

if (!global.__pgPool) {
  if (!process.env.DATABASE_URL) {
    // Instead of throwing at build time, we let it fail at runtime
    console.warn("WARNING: DATABASE_URL is not set. DB will fail at runtime.");
  }

  global.__pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // required by Neon
  });
}

export default global.__pgPool;
