// src/lib/db.ts
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env");
}

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
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
