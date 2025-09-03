// src/app/api/health/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  if (!pool) {
    return NextResponse.json(
      { ok: false, error: "Database pool not initialized." },
      { status: 500 }
    );
  }

  try {
    const result = await pool.query("SELECT NOW()");
    return NextResponse.json({ ok: true, time: result.rows[0].now });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
