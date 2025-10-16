export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

const SOCKET_SERVER =
  process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "https://soulsync-socket-server.onrender.com";

function toLocalISOString(dateStr: string | null, tzOffsetMinutes: number) {
  if (!dateStr || isNaN(tzOffsetMinutes)) return dateStr;
  const date = new Date(dateStr);
  date.setMinutes(date.getMinutes() - tzOffsetMinutes);
  return date.toISOString();
}

/* --------------------- 🔹 GET (Fetch call history) --------------------- */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const pool = getPool();
    const receiverId = parseInt(params.id, 10);
    const url = new URL(req.url);
    const userId = parseInt(url.searchParams.get("user_id") || "0", 10);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);

    const result = await pool.query(
      `SELECT * FROM tblcall
       WHERE (caller_id = $1 AND receiver_id = $2)
          OR (caller_id = $2 AND receiver_id = $1)
       ORDER BY created_at DESC`,
      [userId, receiverId]
    );

    const calls = result.rows.map((row: any) => ({
      ...row,
      started_at_local: row.started_at ? toLocalISOString(row.started_at, tzOffsetMinutes) : null,
      ended_at_local: row.ended_at ? toLocalISOString(row.ended_at, tzOffsetMinutes) : null,
    }));

    return NextResponse.json({ success: true, calls });
  } catch (err: any) {
    console.error("❌ [GET /api/calls] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* --------------------- 🔹 POST (Create new call) --------------------- */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  console.log("🟢 [POST /api/calls] START");

  try {
    const pool = getPool();
    const receiverId = parseInt(params.id, 10);
    const { caller_id, call_type } = await req.json();

    if (!caller_id || !receiverId) {
      return NextResponse.json(
        { success: false, error: "Missing caller_id or receiver_id" },
        { status: 400 }
      );
    }

    // Save call record
    const result = await pool.query(
      `INSERT INTO tblcall (caller_id, receiver_id, call_type, call_status, started_at)
       VALUES ($1, $2, $3, 'ringing', CURRENT_TIMESTAMP)
       RETURNING *`,
      [caller_id, receiverId, call_type || "audio"]
    );

    const call = result.rows[0];
    console.log("✅ Call created:", call);

    // 🔔 Notify socket server for global incoming popup
    await fetch(`${SOCKET_SERVER}/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "call:ringing",
        data: {
          ...call,
          message: "Incoming call",
          receiver_id: receiverId,
          caller_id: caller_id,
        },
      }),
    }).catch((err) => console.error("⚠️ Socket emit failed:", err));

    return NextResponse.json({ success: true, call });
  } catch (err: any) {
    console.error("❌ [POST /api/calls] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* --------------------- 🔹 PATCH (Update call status) --------------------- */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  console.log("🟠 [PATCH /api/calls] START");

  try {
    const pool = getPool();
    const callId = parseInt(params.id, 10);
    const { status } = await req.json();

    if (!callId || !status)
      return NextResponse.json(
        { success: false, error: "Missing call ID or status" },
        { status: 400 }
      );

    let query = "";
    if (status === "accepted")
      query = `UPDATE tblcall SET call_status='accepted', started_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`;
    else if (status === "rejected")
      query = `UPDATE tblcall SET call_status='rejected', ended_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`;
    else if (status === "ended")
      query = `UPDATE tblcall SET call_status='ended', ended_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`;
    else
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });

    const result = await pool.query(query, [callId]);
    const call = result.rows[0];
    if (!call) throw new Error("Call not found");

    // 🔔 Notify socket listeners
    await fetch(`${SOCKET_SERVER}/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: `call:${status}`,
        data: call,
      }),
    }).catch((err) => console.error("⚠️ Socket emit failed:", err));

    console.log(`✅ Call ${status}:`, call.id);
    return NextResponse.json({ success: true, call });
  } catch (err: any) {
    console.error("❌ [PATCH /api/calls] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
