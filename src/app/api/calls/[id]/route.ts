export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { triggerIncomingCall } from "@/lib/pusher/server"; // ✅ Add this

function toLocalISOString(dateStr: string | null, tzOffsetMinutes: number) {
  if (!dateStr || isNaN(tzOffsetMinutes)) return dateStr;
  const date = new Date(dateStr);
  date.setMinutes(date.getMinutes() - tzOffsetMinutes);
  return date.toISOString();
}

// ✅ GET: Fetch all calls between two users
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(req.url);
    const userId = parseInt(url.searchParams.get("user_id") || "0", 10);
    const otherId = parseInt(id, 10);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);

    if (!userId || !otherId) {
      return NextResponse.json({ success: false, error: "Missing user_id or other user id" }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT id, caller_id, receiver_id, call_type, status, started_at, ended_at
       FROM tblcall
       WHERE (caller_id = $1 AND receiver_id = $2)
          OR (caller_id = $2 AND receiver_id = $1)
       ORDER BY started_at ASC`,
      [userId, otherId]
    );

    const calls = result.rows.map((call: any) => ({
      ...call,
      started_at_local: toLocalISOString(call.started_at, tzOffsetMinutes),
      ended_at_local: call.ended_at ? toLocalISOString(call.ended_at, tzOffsetMinutes) : null,
    }));

    return NextResponse.json({ calls });
  } catch (err: any) {
    console.error("❌ GET Calls Error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch calls", details: err.message }, { status: 500 });
  }
}

// ✅ POST: Start a new call and notify receiver
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const receiverId = parseInt(id, 10);
    const url = new URL(req.url);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);
    const pool = getPool();

    const body = await req.json();
    const { caller_id, call_type } = body;

    console.log("📞 POST /calls called with:", { caller_id, receiverId, call_type });

    if (!caller_id || !receiverId || !call_type) {
      console.log("❌ Missing params");
      return NextResponse.json({ success: false, error: "Missing caller_id, receiver_id or call_type" }, { status: 400 });
    }

    // ✅ Prevent duplicate ongoing call
    const check = await pool.query(
      `SELECT id FROM tblcall WHERE caller_id = $1 AND receiver_id = $2 AND status = 'ongoing'`,
      [caller_id, receiverId]
    );

    if (check.rows.length > 0) {
      console.log("⚠️ Duplicate ongoing call detected:", check.rows[0].id);
      return NextResponse.json({
        success: false,
        error: "A call is already ongoing between these users.",
        existing_call_id: check.rows[0].id,
      }, { status: 409 });
    }

    // ✅ Insert new call record with default status 'ringing'
    const result = await pool.query(
      `INSERT INTO tblcall (caller_id, receiver_id, call_type, status)
       VALUES ($1, $2, $3, 'ringing')
       RETURNING *`,
      [caller_id, receiverId, call_type]
    );

    const row = result.rows[0];
    console.log("✅ Call created in DB:", row);

    // ✅ Trigger Pusher event for receiver
    console.log(`🔔 Triggering incoming call for receiver ${receiverId}`);
    await triggerIncomingCall(receiverId, {
      callerId: caller_id,
      callType: call_type,
      callId: row.id,
    });
    console.log("✅ Pusher event triggered successfully");

    return NextResponse.json({
      ...row,
      started_at_local: toLocalISOString(row.started_at, tzOffsetMinutes),
    }, { status: 201 });
  } catch (err: any) {
    console.error("❌ POST Call Error:", err);
    return NextResponse.json({ success: false, error: "Failed to start call", details: err.message }, { status: 500 });
  }
}

// ✅ PATCH: Update call status (ongoing, ended, declined)
export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);
    const { call_id, status } = await req.json();

    if (!call_id || !status) {
      return NextResponse.json({ success: false, error: "Missing call_id or status" }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `UPDATE tblcall 
       SET status = $1, ended_at = CASE WHEN $1 = 'ended' THEN CURRENT_TIMESTAMP ELSE ended_at END
       WHERE id = $2 
       RETURNING *`,
      [status, call_id]
    );

    const row = result.rows[0];
    return NextResponse.json({
      ...row,
      started_at_local: toLocalISOString(row.started_at, tzOffsetMinutes),
      ended_at_local: row.ended_at ? toLocalISOString(row.ended_at, tzOffsetMinutes) : null,
    });
  } catch (err: any) {
    console.error("❌ PATCH Call Error:", err);
    return NextResponse.json({ success: false, error: "Failed to update call", details: err.message }, { status: 500 });
  }
}
