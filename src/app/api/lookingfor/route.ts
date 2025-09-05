export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export async function GET(req: Request) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error("❌ Failed to get DB pool (lookingfor):", err);
    return NextResponse.json(
      { error: "Database connection not initialized." },
      { status: 500 }
    );
  }

  try {
    // Check DB connection
    await pool.query("SELECT 1");

    const result = await pool.query(
      `SELECT id, items FROM tbllookingfor ORDER BY id ASC`
    );

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in /api/lookingfor:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
