// src/app/api/myfriends/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

// ✅ POST: Follow/Add Friend
export async function POST(req: Request) {
  try {
    const { userId, friendId } = await req.json();

    if (!userId || !friendId) {
      return NextResponse.json(
        { success: false, message: "Invalid data" },
        { status: 400 }
      );
    }

    const pool = getPool();

    const existing = await pool.query(
      `SELECT id FROM tbluser_follow WHERE follower_id = $1 AND following_id = $2`,
      [userId, friendId]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json({ success: true, message: "Already following" });
    }

    await pool.query(
      `INSERT INTO tbluser_follow (follower_id, following_id, created_at)
       VALUES ($1, $2, NOW())`,
      [userId, friendId]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /myfriends] Error:", err.message);
    return NextResponse.json(
      { success: false, message: "Failed to add friend", error: err.message },
      { status: 500 }
    );
  }
}
