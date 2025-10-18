// src/app/api/health/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import getPool from "@/lib/db"; // import function

export async function GET() {
  let pool;
  try {
    pool = getPool(); // get the actual Pool instance
  } catch (err) {
    console.error("❌ Failed to get DB pool:", err);
    return NextResponse.json(
      { ok: false, error: "Database connection not initialized." },
      { status: 500 }
    );
  }

  try {
    // Test DB connection
    await pool.query("SELECT 1");
    console.log("✅ DB connection OK for /api/health request");

    const result = await pool.query("SELECT NOW()");
    return NextResponse.json({ ok: true, time: result.rows[0].now });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ /api/health error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
