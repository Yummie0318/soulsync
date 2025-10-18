import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error("❌ Failed to get DB pool (locationdetails):", err);
    return NextResponse.json(
      { error: "Database connection not initialized." },
      { status: 500 }
    );
  }

  try {
    await pool.query("SELECT 1");

    const result = await pool.query(
      `SELECT id, details FROM tbllocationdetails ORDER BY id ASC`
    );

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in /api/locationdetails:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
