import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error("❌ Failed to get DB pool (user-island):", err);
    return NextResponse.json(
      { error: "Database connection not initialized." },
      { status: 500 }
    );
  }

  try {
    await pool.query("SELECT 1"); // sanity check

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    // Fetch user with island_id
    const result = await pool.query(
      "SELECT id, island_id FROM tbluser WHERE id = $1",
      [userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in /api/user-island:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
