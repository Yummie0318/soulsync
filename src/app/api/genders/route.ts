export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export async function GET(req: Request) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error("❌ Failed to get DB pool (genders):", err);
    return NextResponse.json(
      { error: "Database connection not initialized." },
      { status: 500 }
    );
  }

  try {
    await pool.query("SELECT 1");

    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "en";

    const columnMap: Record<string, string> = {
      en: "gender",
      de: "gender_de",
      zh: "gender_zh",
    };
    const column = columnMap[locale] || "gender";

    const result = await pool.query(
      `SELECT id, ${column} AS gender FROM tblgender ORDER BY id ASC`
    );

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in /api/genders:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
