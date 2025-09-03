// src/app/api/interests/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "en";

    const columnMap: Record<string, string> = {
      en: "interest",
      de: "interest_de",
      zh: "interest_zh",
    };

    const column = columnMap[locale] || "interest";

    console.log("📌 Fetching interests with column:", column);

    const result = await pool.query(
      `SELECT id, ${column} AS interest FROM tblinterest ORDER BY id ASC`
    );

    console.log("✅ Query result:", result.rows);

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in /api/interests:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
