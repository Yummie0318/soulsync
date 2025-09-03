// src/app/api/interests/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db"; // notice it's a function now

export async function GET(req: Request) {
  let pool;
  try {
    pool = getPool(); // get actual Pool instance
  } catch (err) {
    console.error("❌ Failed to get DB pool:", err);
    return NextResponse.json(
      { error: "Database connection not initialized." },
      { status: 500 }
    );
  }

  try {
    // Test DB connection
    try {
      await pool.query("SELECT 1");
      console.log("✅ DB connection OK for /api/interests request");
    } catch (connErr) {
      console.error("❌ DB connection failed for /api/interests request:", connErr);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

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
