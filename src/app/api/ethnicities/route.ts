export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export async function GET(req: Request) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error("❌ Failed to get DB pool (ethnicities):", err);
    return NextResponse.json({ error: "Database connection not initialized." }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "en";

    const columnMap: Record<string, string> = {
      en: "ethnicity",
      de: "ethnicity_de",
      zh: "ethnicity_zh",
    };
    const column = columnMap[locale] || "ethnicity";

    const result = await pool.query(
      `SELECT id, ${column} AS ethnicity FROM tblethnicity ORDER BY id ASC`
    );

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    console.error("❌ Error in /api/ethnicities:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
