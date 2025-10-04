export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { triggerCallResponse } from "@/lib/pusher/server";

export async function POST(req: Request) {
  try {
    const { callerId, receiverId, response, callId } = await req.json();

    if (!callerId || !receiverId || !response || !callId) {
      return NextResponse.json(
        { success: false, error: "Missing params" },
        { status: 400 }
      );
    }

    const pool = getPool();

    // ✅ Set call status
    const status = response === "accepted" ? "ongoing" : "declined";

    // ✅ Update call in DB
    const query =
      status === "declined"
        ? `UPDATE tblcall SET status = $1, ended_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`
        : `UPDATE tblcall SET status = $1 WHERE id = $2 RETURNING *`;

    const result = await pool.query(query, [status, callId]);
    const updatedCall = result.rows[0];

    console.log(`📞 Call ${status} in DB:`, updatedCall);

    // ✅ Notify caller via Pusher
    // This triggers the caller to redirect
    await triggerCallResponse(callerId, receiverId, response);

    console.log(`🔔 Triggered call-response to caller ${callerId}:`, response);

    return NextResponse.json({ success: true, status, updatedCall });
  } catch (err: any) {
    console.error("❌ Respond Call Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to respond to call", details: err.message },
      { status: 500 }
    );
  }
}
