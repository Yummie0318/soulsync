export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

/* ======================================================
   🧩 Helpers
====================================================== */
async function getUser(pool: any, id: number) {
  const res = await pool.query(
    `SELECT id, username, photo_file_path AS photo, last_active FROM tbluser WHERE id=$1`,
    [id]
  );
  return res.rows[0] || null;
}

async function emitSocket(event: string, data: any) {
  try {
    await fetch("https://soulsync-socket-server.onrender.com/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data }),
    });
    console.log(`📤 Emitted ${event}`);
  } catch (err) {
    console.error("❌ Socket emit failed:", err);
  }
}

/* ======================================================
   ✅ GET /api/calls/[id]
   → Fetch single call + user info
====================================================== */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  console.log(`🟢 [GET /api/calls/${params.id}]`);
  try {
    const pool = getPool();
    const call_id = parseInt(params.id, 10);

    const result = await pool.query(`SELECT * FROM tblcall WHERE id=$1`, [call_id]);
    const call = result.rows[0];

    if (!call) {
      return NextResponse.json({ success: false, error: "Call not found" }, { status: 404 });
    }

    const [caller, receiver] = await Promise.all([
      getUser(pool, call.caller_id),
      getUser(pool, call.receiver_id),
    ]);

    return NextResponse.json({ success: true, call: { ...call, caller, receiver } });
  } catch (err: any) {
    console.error("❌ GET /api/calls/[id] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ======================================================
   ✅ DELETE /api/calls/[id]
   → Delete a call record + emit socket event
====================================================== */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  console.log(`🗑️ [DELETE /api/calls/${params.id}]`);
  try {
    const pool = getPool();
    const call_id = parseInt(params.id, 10);

    // ✅ Fetch call before deleting (for socket emit)
    const existing = await pool.query(`SELECT * FROM tblcall WHERE id=$1`, [call_id]);
    const call = existing.rows[0];
    if (!call) {
      return NextResponse.json({ success: false, error: "Call not found" }, { status: 404 });
    }

    await pool.query(`DELETE FROM tblcall WHERE id=$1`, [call_id]);

    // ✅ Emit deletion event
    await emitSocket("call:deleted", { id: call_id });

    return NextResponse.json({ success: true, message: "Call deleted successfully" });
  } catch (err: any) {
    console.error("❌ DELETE /api/calls/[id] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
