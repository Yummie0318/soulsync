// src/app/api/follow/route.ts
import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";

// ✅ Follow a user
export async function POST(req: Request) {
  const pool = getPool();
  const { followerId, followingId } = await req.json();

  if (!followerId || !followingId) {
    return NextResponse.json({ error: "Missing IDs" }, { status: 400 });
  }

  try {
    await pool.query(
      `INSERT INTO tbluser_follow (follower_id, following_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [followerId, followingId]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error following user:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ✅ Unfollow a user
export async function DELETE(req: Request) {
  const pool = getPool();
  const { followerId, followingId } = await req.json();

  if (!followerId || !followingId) {
    return NextResponse.json({ error: "Missing IDs" }, { status: 400 });
  }

  try {
    await pool.query(
      `DELETE FROM tbluser_follow WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error unfollowing user:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
