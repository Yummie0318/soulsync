export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

// ✅ POST: update typing state
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("POST /api/typing body:", body);

    const sender_id = Number(body.sender_id);
    const receiver_id = Number(body.receiver_id);
    const is_typing = body.is_typing;

    if (!sender_id || !receiver_id || typeof is_typing !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Missing sender_id, receiver_id or is_typing" },
        { status: 400 }
      );
    }

    const pool = getPool();

    if (is_typing) {
      // Insert or update typing
      const result = await pool.query(
        `
        INSERT INTO tbltyping (sender_id, receiver_id, is_typing, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (sender_id, receiver_id)
        DO UPDATE SET is_typing = EXCLUDED.is_typing, updated_at = NOW()
        RETURNING *;
        `,
        [sender_id, receiver_id, is_typing]
      );

      return NextResponse.json({ success: true, data: result.rows[0] });
    } else {
      // Delete typing record if typing stopped
      await pool.query(
        `DELETE FROM tbltyping WHERE sender_id = $1 AND receiver_id = $2`,
        [sender_id, receiver_id]
      );

      return NextResponse.json({ success: true, data: null });
    }
  } catch (err: any) {
    console.error("POST /api/typing error:", err);
    return NextResponse.json(
      { success: false, error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// ✅ GET: get current typing state (with timezone adjustment + auto-delete stale)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sender_id = Number(url.searchParams.get("sender_id"));
    const receiver_id = Number(url.searchParams.get("receiver_id"));
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);

    if (!sender_id || !receiver_id) {
      return NextResponse.json(
        { success: false, error: "Missing sender_id or receiver_id" },
        { status: 400 }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT is_typing, updated_at FROM tbltyping WHERE sender_id = $1 AND receiver_id = $2`,
      [sender_id, receiver_id]
    );

    const row = result.rows[0];

    if (!row) {
      return NextResponse.json({ success: true, is_typing: false, updated_at: null });
    }

    // Adjust for client timezone
    let updatedAtLocal: string | null = null;
    if (row.updated_at) {
      const date = new Date(row.updated_at);
      if (!isNaN(tzOffsetMinutes)) {
        date.setMinutes(date.getMinutes() - tzOffsetMinutes);
      }
      updatedAtLocal = date.toISOString();
    }

    const now = Date.now();
    const updatedAtTimestamp = updatedAtLocal ? new Date(updatedAtLocal).getTime() : 0;

    // If typing record is older than 10s, delete it
    let validTyping = row.is_typing;
    if (!updatedAtTimestamp || now - updatedAtTimestamp > 10_000) {
      validTyping = false;
      await pool.query(
        `DELETE FROM tbltyping WHERE sender_id = $1 AND receiver_id = $2`,
        [sender_id, receiver_id]
      );
    }

    return NextResponse.json({ success: true, is_typing: validTyping, updated_at: updatedAtLocal });
  } catch (err: any) {
    console.error("GET /api/typing error:", err);
    return NextResponse.json(
      { success: false, error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
