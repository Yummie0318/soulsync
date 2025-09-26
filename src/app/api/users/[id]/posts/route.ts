// src/app/api/users/[id]/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pool = getPool();
    const { searchParams } = new URL(req.url);
    const currentUserId = Number(searchParams.get("currentUserId")) || null; // pass ?currentUserId=1

    const userId = Number(params.id);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT 
        p.id,
        p.text,
        p.image_path,
        p.created_at,
        u.username,
        u.photo_file_path,
        -- count likes
        (SELECT COUNT(*) FROM tbllike l WHERE l.post_id = p.id) AS likes_count,
        -- check if current user liked
        CASE 
          WHEN $2::int IS NOT NULL AND EXISTS (
            SELECT 1 FROM tbllike l2 WHERE l2.post_id = p.id AND l2.user_id = $2
          ) THEN true
          ELSE false
        END AS "isLikedByCurrentUser"
      FROM tblpost p
      JOIN tbluser u ON u.id = p.user_id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
      `,
      [userId, currentUserId]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("❌ API /users/[id]/posts GET error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch posts", details: err.message },
      { status: 500 }
    );
  }
}
