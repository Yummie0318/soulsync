// src/lib/db.ts
import pkg from "pg";
import type { Pool as PoolType } from "pg";
const { Pool } = pkg;

declare global {
  var __pgPool: PoolType | undefined;
}

// Create pool lazily at runtime
const getPool = (): PoolType => {
  if (!global.__pgPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("❌ DATABASE_URL is not set. Cannot connect to DB.");
    }

    global.__pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required by Neon
    });

    console.log("✅ Database pool created at runtime");
  }
  return global.__pgPool;
};

export default getPool;
