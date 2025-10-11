import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";

/* -----------------------------------------------------
   🔹 Helper: determine if user is online
----------------------------------------------------- */
function isUserOnline(lastActive: string | null, thresholdMs = 30_000) {
  if (!lastActive) return false;
  const last = new Date(lastActive).getTime();
  return Date.now() - last <= thresholdMs;
}

/* -----------------------------------------------------
   🔹 Helper: convert UTC to local ISO time
----------------------------------------------------- */
function toLocalISOString(dateStr: string | null, tzOffsetMinutes: number) {
  if (!dateStr || isNaN(tzOffsetMinutes)) return dateStr;
  const date = new Date(dateStr);
  date.setMinutes(date.getMinutes() - tzOffsetMinutes);
  return date.toISOString();
}

/* -----------------------------------------------------
   ✅ GET /api/conversations/[userId]
----------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const userIdStr = pathParts[pathParts.length - 1];
    const userId = parseInt(userIdStr, 10);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing userId" },
        { status: 400 }
      );
    }

    const pool = getPool();

    // 🟢 Step 1: Fetch the most recent message per conversation
    const result = await pool.query(
      `
      SELECT DISTINCT ON (
        LEAST(m.sender_id, m.receiver_id),
        GREATEST(m.sender_id, m.receiver_id)
      )
        m.id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.message_type,
        m.file_name,
        m.file_path,
        m.status,
        m.created_at,
        u.id AS user_id,
        u.username,
        u.photo_file_path AS photo,
        u.last_active
      FROM tblmessage m
      JOIN tbluser u 
        ON u.id = CASE 
                    WHEN m.sender_id = $1 THEN m.receiver_id 
                    ELSE m.sender_id 
                  END
      WHERE m.sender_id = $1 OR m.receiver_id = $1
      ORDER BY 
        LEAST(m.sender_id, m.receiver_id),
        GREATEST(m.sender_id, m.receiver_id),
        m.created_at DESC
      `,
      [userId]
    );

    // 🟢 Step 2: Unread messages count
    const unreadResult = await pool.query(
      `
      SELECT sender_id, COUNT(*) AS unread_count
      FROM tblmessage
      WHERE receiver_id = $1 AND status != 'read'
      GROUP BY sender_id
      `,
      [userId]
    );

    const unreadMap = new Map<number, number>();
    unreadResult.rows.forEach((r) =>
      unreadMap.set(r.sender_id, parseInt(r.unread_count, 10))
    );

    // 🟢 Step 3: Build conversation list
    const conversations = result.rows.map((row) => {
      const last_active_local = toLocalISOString(row.last_active, tzOffsetMinutes);
      const unreadCount = unreadMap.get(row.user_id) || 0;

      return {
        id: row.id,
        user: {
          id: row.user_id,
          username: row.username,
          photo: row.photo || null,
          last_active: row.last_active,
          last_active_local,
          isOnline: isUserOnline(last_active_local), // ✅ FIXED
        },
        lastMessage:
          row.message_type === "file"
            ? row.file_name || "📎 Attachment"
            : row.content || "Media",
        message_type: row.message_type,
        status: row.status,
        unreadCount,
        updatedAt: row.created_at,
      };
    });

    // 🧩 Sort by most recent
    conversations.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json(conversations);
  } catch (err: any) {
    console.error("❌ GET /api/conversations Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch conversations",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
