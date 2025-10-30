import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export async function POST(req: Request) {
  console.log("🔁 [POST /api/ai/datescheduler/reschedule] Request received...");

  try {
    const { schedule_id, new_date, receiver_id, reason } = await req.json();

    if (!schedule_id || !new_date || !receiver_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const pool = getPool();

    // 🧠 Check if schedule exists
    const existing = await pool.query(
      `SELECT * FROM tblaischedule WHERE id = $1`,
      [schedule_id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Schedule not found" },
        { status: 404 }
      );
    }

    const schedule = existing.rows[0];

    // 💾 Update schedule with new date + status
    const update = await pool.query(
      `UPDATE tblaischedule
       SET rescheduled_date = $1,
           status = 'rescheduled',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [new_date, schedule_id]
    );

    const updatedSchedule = update.rows[0];

    // 💬 Log message to sender
    const msg = await pool.query(
      `INSERT INTO tblmessage
       (sender_id, receiver_id, content, message_type, status, deleted, generated_by)
       VALUES ($1, $2, $3, 'reschedule_notice', 'sent', false, 'system')
       RETURNING *`,
      [
        receiver_id, // sender of this message
        schedule.sender_id, // receiver of notice
        `📅 ${schedule.receiver_id} has proposed a new date:\nNew date: ${new_date}\nReason: ${
          reason || "No reason given"
        }`,
      ]
    );

    // 📡 Notify via Socket.IO (optional)
    try {
      await fetch("https://soulsync-socket-server.onrender.com/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "message:new",
          data: msg.rows[0],
        }),
      });
      console.log("📤 [SOCKET] Reschedule emitted!");
    } catch (err) {
      console.error("⚠️ [SOCKET] Failed to emit reschedule:", err);
    }

    return NextResponse.json({
      success: true,
      updatedSchedule,
      message: msg.rows[0],
    });
  } catch (error: any) {
    console.error("❌ [Reschedule Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
