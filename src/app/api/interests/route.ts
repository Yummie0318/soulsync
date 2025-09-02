// src/app/api/interests/route.ts
import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "en";

    // Map locale to DB column
    const columnMap: Record<string, string> = {
      en: "interest",
      de: "interest_de",
      zh: "interest_zh",
    };

    // fallback to English if locale not in map
    const column = columnMap[locale] || "interest";

    console.log("📌 Fetching interests with column:", column);

    const result = await pool.query(
      `SELECT id, ${column} AS interest FROM tblinterest ORDER BY id ASC`
    );

    console.log("✅ Query result:", result.rows);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("❌ Error in /api/interests:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
