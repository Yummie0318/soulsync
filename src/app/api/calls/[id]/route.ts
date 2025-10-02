// src/app/api/calls/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

// ✅ GET call history between two users
export async function GET(
  req: Request,
  { params }: { params: { id: string } } // receiver_id
) {
  const url = new URL(req.url);
  const callerId = parseInt(url.searchParams.get("caller_id") || "0", 10);
  const receiverId = parseInt(params.id, 10);

  if (!callerId || !receiverId) {
    return NextResponse.json({ error: "Missing caller_id or receiver_id" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `
      SELECT *
      FROM tblcall
      WHERE (caller_id = $1 AND receiver_id = $2)
         OR (caller_id = $2 AND receiver_id = $1)
      ORDER BY started_at DESC
      `,
      [callerId, receiverId]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch calls", details: err.message }, { status: 500 });
  }
}

// ✅ POST → start a new call (audio / video)
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { caller_id, call_type } = body;
    const receiver_id = parseInt(params.id, 10);

    if (!caller_id || !receiver_id || !call_type) {
      return NextResponse.json({ error: "Missing caller_id, receiver_id, or call_type" }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `
      INSERT INTO tblcall (caller_id, receiver_id, call_type, status)
      VALUES ($1, $2, $3, 'ongoing')
      RETURNING *
      `,
      [caller_id, receiver_id, call_type]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to start call", details: err.message }, { status: 500 });
  }
}

// ✅ PATCH → end call / mark missed
export async function PATCH(req: Request) {
  try {
    const { call_id, status } = await req.json();
    if (!call_id || !status) {
      return NextResponse.json({ error: "Missing call_id or status" }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `
      UPDATE tblcall 
      SET status = $1, ended_at = CURRENT_TIMESTAMP
      WHERE id = $2 RETURNING *
      `,
      [status, call_id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update call", details: err.message }, { status: 500 });
  }
}
