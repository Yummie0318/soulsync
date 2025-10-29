import { NextResponse } from "next/server";
import getPool from "@/lib/db";

/**
 * POST /api/ai/datescheduler/status
 * Body:
 * {
 *   message_id: number,
 *   status: "accepted" | "declined" | "cancelled" | "rescheduled",
 *   reschedule_data?: {
 *     sender_id: number,
 *     receiver_id: number,
 *     date: string,
 *     location?: string,
 *     activity?: string,
 *     vibe?: string,
 *   }
 * }
 */
export async function POST(req: Request) {
  console.log("📩 [POST /api/ai/datescheduler/status] Request received");

  try {
    const { message_id, status, reschedule_data } = await req.json();
    const pool = getPool();

    if (!message_id || !status) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: message_id or status",
      });
    }

    const validStatuses = ["accepted", "declined", "cancelled", "rescheduled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: "Invalid status value",
      });
    }

    // 🔹 Handle RESCHEDULE — update schedule + message
    if (status === "rescheduled" && reschedule_data) {
      const { sender_id, receiver_id, date, location, activity, vibe } = reschedule_data;

      if (!sender_id || !receiver_id || !date) {
        return NextResponse.json({
          success: false,
          error: "Missing reschedule details (sender_id, receiver_id, or date)",
        });
      }

      // 🔎 Find the schedule linked to this message
      const scheduleQuery = await pool.query(
        `SELECT id FROM tblaischedule WHERE ai_message_id = $1`,
        [message_id]
      );

      if (scheduleQuery.rowCount === 0) {
        return NextResponse.json({
          success: false,
          error: "No linked schedule found for this message",
        });
      }

      const schedule_id = scheduleQuery.rows[0].id;

      // 🕒 Update tblaischedule
      const utcRescheduleDate = new Date(date).toISOString();

      const scheduleUpdate = await pool.query(
        `
        UPDATE tblaischedule
        SET 
          rescheduled_date = $1,
          location = COALESCE($2, location),
          activity = COALESCE($3, activity),
          vibe = COALESCE($4, vibe),
          status = 'rescheduled',
          updated_at = NOW()
        WHERE id = $5
        RETURNING *;
        `,
        [utcRescheduleDate, location, activity, vibe, schedule_id]
      );
      

      const updatedSchedule = scheduleUpdate.rows[0];

      // 🕒 Update tblmessage (add rescheduled_date)
      const messageUpdate = await pool.query(
        `
        UPDATE tblmessage
        SET 
          schedule_status = 'rescheduled',
          rescheduled_date = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING id, schedule_status, rescheduled_date;
        `,
        [date, message_id]
      );

      const updatedMessage = messageUpdate.rows[0];

      // 📡 Emit socket event
      try {
        await fetch("https://soulsync-socket-server.onrender.com/emit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "schedule:rescheduled",
            data: {
              message_id,
              schedule_id,
              rescheduled_date: updatedMessage.rescheduled_date,
            },
          }),
        });
        console.log("📡 [SOCKET] Schedule reschedule event emitted");
      } catch (err) {
        console.error("⚠️ [SOCKET] Failed to emit reschedule event:", err);
      }

      return NextResponse.json({
        success: true,
        message: "Schedule successfully rescheduled.",
        updatedMessage,
      });
    }

    // 🔹 Handle ACCEPT / DECLINE / CANCEL
    const scheduleQuery = await pool.query(
      `SELECT id FROM tblaischedule WHERE ai_message_id = $1`,
      [message_id]
    );

    if (scheduleQuery.rowCount === 0) {
      return NextResponse.json({
        success: false,
        error: "No linked schedule found for this message",
      });
    }

    const schedule_id = scheduleQuery.rows[0].id;

    // 🕒 Update tblaischedule
    const scheduleUpdate = await pool.query(
      `
      UPDATE tblaischedule
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
      `,
      [status, schedule_id]
    );

    const updatedSchedule = scheduleUpdate.rows[0];

    // 🕒 Update tblmessage
    await pool.query(
      `
      UPDATE tblmessage
      SET schedule_status = $1, updated_at = NOW()
      WHERE id = $2;
      `,
      [status, message_id]
    );

    // 📡 Emit socket event
    try {
      await fetch("https://soulsync-socket-server.onrender.com/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "schedule:update",
          data: { message_id, schedule_id, status },
        }),
      });
      console.log("📡 [SOCKET] Schedule status emitted:", { message_id, schedule_id, status });
    } catch (err) {
      console.error("⚠️ [SOCKET] Failed to emit schedule update:", err);
    }

    // ✅ Success
    return NextResponse.json({
      success: true,
      message: `Schedule ${status} successfully.`,
      data: { message_id, schedule_id, status, updatedSchedule },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("❌ [datescheduler/status] error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Server error",
    });
  }
}
