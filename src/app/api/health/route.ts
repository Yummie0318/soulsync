// src/app/api/health/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query("SELECT NOW()");
    return NextResponse.json({ ok: true, time: result.rows[0].now });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
