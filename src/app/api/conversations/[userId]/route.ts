// src/app/api/conversations/[userId]/route.ts
import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";

// ✅ Helper: determine online status
function isUserOnline(lastActive: string | null, thresholdMs = 30_000) {
  if (!lastActive) return false;
  const last = new Date(lastActive).getTime();
  return Date.now() - last <= thresholdMs;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pathnameParts = url.pathname.split("/"); // ['', 'api', 'conversations', '[userId]']
    const userIdStr = pathnameParts[pathnameParts.length - 1];
    const userId = parseInt(userIdStr, 10);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Invalid userId" },
        { status: 400 }
      );
    }

    const pool = getPool();

    const result = await pool.query(
      `
      SELECT 
        m.id, m.sender_id, m.receiver_id,
        m.content, m.message_type,
        m.file_name, m.file_path,
        m.status, m.created_at,
        u.id as user_id, u.username, u.photo_file_path as photo, u.last_active
      FROM tblmessage m
      JOIN tbluser u 
        ON u.id = CASE 
                    WHEN m.sender_id = $1 THEN m.receiver_id 
                    ELSE m.sender_id 
                  END
      WHERE m.sender_id = $1 OR m.receiver_id = $1
      ORDER BY m.created_at DESC
      `,
      [userId]
    );

    const conversationsMap = new Map<number, any>();

    result.rows.forEach(row => {
      const otherId = row.user_id;

      // Convert last_active to client local time
      let last_active_local = row.last_active;
      if (row.last_active && !isNaN(tzOffsetMinutes)) {
        const date = new Date(row.last_active);
        date.setMinutes(date.getMinutes() - tzOffsetMinutes);
        last_active_local = date.toISOString();
      }

      if (!conversationsMap.has(otherId)) {
        conversationsMap.set(otherId, {
          id: otherId,
          user: {
            id: row.user_id,
            username: row.username,
            photo: row.photo,
            last_active: row.last_active,
            last_active_local,
            isOnline: isUserOnline(last_active_local),
          },
          lastMessage: row.content,
          updatedAt: row.created_at,
        });
      }
    });

    return NextResponse.json(Array.from(conversationsMap.values()));
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversations", details: err.message },
      { status: 500 }
    );
  }
}
