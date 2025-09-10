export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export async function GET(req: Request) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error("❌ Failed to get DB pool (ethnicities):", err);
    return NextResponse.json(
      { error: "Database connection not initialized." },
      { status: 500 }
    );
  }

  try {
    await pool.query("SELECT 1"); // check connection

    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "en";

    // Map locale to the correct column
    const columnMap: Record<string, string> = {
      en: "ethnicity",
      de: "ethnicity_de",
      zh: "ethnicity_zh",
    };
    const column = columnMap[locale] || "ethnicity";

    // Query the database using the correct column
    const result = await pool.query(
      `SELECT id, ${column} AS ethnicity FROM tblethnicity ORDER BY id ASC`
    );

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in /api/ethnicities:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
