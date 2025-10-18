export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

/* -----------------------------------------------------
   Helpers
----------------------------------------------------- */
async function emitSocket(event: string, data: any) {
  try {
    const res = await fetch("https://soulsync-socket-server.onrender.com/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data }),
    });
    if (!res.ok) throw new Error(`Socket emit failed (${res.status})`);
    console.log(`📤 Emitted → ${event}`);
  } catch (err) {
    console.error("❌ Socket emit failed:", err);
  }
}

function toLocalISOString(dateStr: string | null, tzOffsetMinutes: number) {
  if (!dateStr || isNaN(tzOffsetMinutes)) return dateStr;
  const date = new Date(dateStr);
  date.setMinutes(date.getMinutes() - tzOffsetMinutes);
  return date.toISOString();
}

/* -----------------------------------------------------
   POST /api/calls → Start new call
----------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const { caller_id, receiver_id, call_type = "audio" } = await req.json();

    if (!caller_id || !receiver_id)
      return NextResponse.json({ success: false, error: "Missing caller_id or receiver_id" }, { status: 400 });

    const pool = getPool();

    const insertQuery = `
      INSERT INTO tblcall (caller_id, receiver_id, call_type, call_status, started_at)
      VALUES ($1,$2,$3,'ringing', CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const { rows } = await pool.query(insertQuery, [caller_id, receiver_id, call_type]);
    const call = rows[0];

    await emitSocket("call:ringing", call);

    return NextResponse.json({ success: true, call }, { status: 201 });
  } catch (err: any) {
    console.error("❌ POST /api/calls error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------
   PATCH /api/calls → Update call state (accept/reject/end)
----------------------------------------------------- */
export async function PATCH(req: Request) {
  try {
    const { call_id, action, receiver_id } = await req.json();

    if (!call_id || !action)
      return NextResponse.json({ success: false, error: "Missing call_id or action" }, { status: 400 });

    const pool = getPool();

    // 🧩 Define state transitions
    const actionMap: Record<
      string,
      { status: string; setStart?: boolean; setEnd?: boolean; event: string }
    > = {
      accept: { status: "accepted", setStart: true, event: "call:accepted" },
      reject: { status: "rejected", setEnd: true, event: "call:rejected" },
      cancel: { status: "cancelled", setEnd: true, event: "call:cancelled" },
      end: { status: "ended", setEnd: true, event: "call:ended" },
    };

    const cfg = actionMap[action];
    if (!cfg)
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

    // 🧮 Dynamic SQL
    const updateParts = [`call_status='${cfg.status}'`];
    if (cfg.setStart) updateParts.push(`started_at=CURRENT_TIMESTAMP`);
    if (cfg.setEnd) updateParts.push(`ended_at=CURRENT_TIMESTAMP`);

    const query = `
      UPDATE tblcall
      SET ${updateParts.join(", ")}
      WHERE id=$1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [call_id]);
    const updated = rows[0];

    if (!updated)
      return NextResponse.json({ success: false, error: "Call not found" }, { status: 404 });

    console.log(`💾 Call ${call_id} → '${cfg.status}'`);

    // 🔔 Emit socket event
    await emitSocket(cfg.event, { ...updated, receiver_id });

    // ⚡ If call ended, emit cleanup signal
    if (action === "end") {
      await emitSocket("call:end", { call_id, message: "Call has ended" });
    }

    return NextResponse.json({ success: true, call: updated });
  } catch (err: any) {
    console.error("❌ PATCH /api/calls error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------
   GET /api/calls → Fetch call(s)
----------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const call_id = url.searchParams.get("call_id");
    const caller_id = url.searchParams.get("caller_id");
    const receiver_id = url.searchParams.get("receiver_id");
    const user_id = url.searchParams.get("user_id");
    const tzOffset = parseInt(url.searchParams.get("tz") || "0", 10);

    const pool = getPool();

    const baseSelect = (where: string, params: any[]) =>
      pool.query(`SELECT * FROM tblcall ${where} ORDER BY created_at DESC LIMIT 100`, params);

    let result;
    if (call_id) {
      result = await pool.query(`SELECT * FROM tblcall WHERE id=$1`, [call_id]);
      if (!result.rows[0])
        return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      const row = result.rows[0];
      return NextResponse.json({
        success: true,
        call: {
          ...row,
          started_at_local: toLocalISOString(row.started_at, tzOffset),
          ended_at_local: toLocalISOString(row.ended_at, tzOffset),
        },
      });
    }

    if (caller_id && receiver_id) {
      result = await baseSelect(
        `WHERE (caller_id=$1 AND receiver_id=$2) OR (caller_id=$2 AND receiver_id=$1)`,
        [caller_id, receiver_id]
      );
    } else if (user_id) {
      result = await baseSelect(`WHERE caller_id=$1 OR receiver_id=$1`, [user_id]);
    } else {
      result = await baseSelect("", []);
    }

    const rows = result.rows.map((r) => ({
      ...r,
      started_at_local: toLocalISOString(r.started_at, tzOffset),
      ended_at_local: toLocalISOString(r.ended_at, tzOffset),
    }));

    return NextResponse.json({ success: true, calls: rows });
  } catch (err: any) {
    console.error("❌ GET /api/calls error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
