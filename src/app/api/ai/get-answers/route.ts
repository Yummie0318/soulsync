export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export async function GET(req: Request) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error("❌ Failed to get DB pool (get-answers):", err);
    return NextResponse.json(
      { error: "Database connection not initialized." },
      { status: 500 }
    );
  }

  try {
    await pool.query("SELECT 1"); // sanity check

    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user_id parameter" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT id, question_text, answer_text, created_at
       FROM tbluser_answers
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [user_id]
    );

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in /api/ai/get-answers:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
