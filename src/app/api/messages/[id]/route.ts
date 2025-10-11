export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import fs from "fs";
import path from "path";

/* -----------------------------------------------------
   🔹 Helper: check if a user is online
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
   ✅ GET /api/messages/[id]
----------------------------------------------------- */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  console.log("🟢 [GET /api/messages] Request received");
  try {
    const params = await context.params;
    const receiverId = parseInt(params.id, 10);
    const url = new URL(req.url);
    const senderId = parseInt(url.searchParams.get("sender_id") || "0", 10);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);

    console.log("📥 Sender:", senderId, "Receiver:", receiverId);

    if (!senderId || !receiverId) {
      console.warn("⚠️ Missing sender_id or receiver_id");
      return NextResponse.json({ success: false, error: "Missing sender_id or receiver_id" }, { status: 400 });
    }

    const pool = getPool();

    const unreadResult = await pool.query(
      `SELECT COUNT(*) AS unread_count
       FROM tblmessage
       WHERE sender_id = $2 AND receiver_id = $1 AND status != 'read' AND deleted = false`,
      [senderId, receiverId]
    );
    const unreadCount = parseInt(unreadResult.rows[0]?.unread_count || "0", 10);
    console.log("📨 Unread messages before:", unreadCount);

    if (unreadCount > 0) {
      await pool.query(
        `UPDATE tblmessage
         SET status = 'read', updated_at = CURRENT_TIMESTAMP
         WHERE sender_id = $2 AND receiver_id = $1 AND status != 'read' AND deleted = false`,
        [senderId, receiverId]
      );
      console.log("✅ Marked messages as read");
    }

    const messagesResult = await pool.query(
      `SELECT 
        m.id, m.sender_id, m.receiver_id, m.content, m.message_type,
        m.file_name, m.file_path, m.status, m.emoji_reactions,
        m.created_at, m.edited, m.edited_at, m.deleted,
        r.id AS reply_to_id, r.content AS reply_content, r.sender_id AS reply_sender_id
       FROM tblmessage m
       LEFT JOIN tblmessage r ON m.reply_to_id = r.id
       WHERE ((m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1))
         AND m.deleted = false
       ORDER BY m.created_at ASC`,
      [senderId, receiverId]
    );

    console.log(`💬 Loaded ${messagesResult.rows.length} messages`);

    const messages = messagesResult.rows.map((msg: any) => ({
      ...msg,
      created_at_local: toLocalISOString(msg.created_at, tzOffsetMinutes),
      edited_at_local: msg.edited_at ? toLocalISOString(msg.edited_at, tzOffsetMinutes) : null,
      reply: msg.reply_to_id
        ? { id: msg.reply_to_id, content: msg.reply_content, sender_id: msg.reply_sender_id }
        : null,
    }));

    const userResult = await pool.query(
      `SELECT id, username, photo_file_path AS photo, last_active
       FROM tbluser
       WHERE id = $1`,
      [receiverId]
    );

    const receiverRow = userResult.rows[0];
    const last_active_local = receiverRow
      ? toLocalISOString(receiverRow.last_active, tzOffsetMinutes)
      : null;

    const receiver = receiverRow
      ? {
          id: receiverRow.id,
          username: receiverRow.username,
          photo: receiverRow.photo || null,
          last_active: receiverRow.last_active,
          last_active_local,
          isOnline: isUserOnline(receiverRow.last_active),
        }
      : null;

    console.log("✅ [GET /api/messages] Complete");
    return NextResponse.json({
      success: true,
      messages,
      receiver,
      unreadCountBeforeRead: unreadCount,
    });
  } catch (err: any) {
    console.error("❌ [GET /api/messages] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------
   ✅ POST /api/messages/[id]
----------------------------------------------------- */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  console.log("🟢 [POST /api/messages] Request received");
  try {
    const params = await context.params;
    const receiverId = parseInt(params.id, 10);
    const pool = getPool();
    const url = new URL(req.url);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);

    const contentType = req.headers.get("content-type") || "";

    // 🟡 Handle file upload
    if (contentType.includes("multipart/form-data")) {
      console.log("📂 Multipart upload detected");
      const formData = await req.formData();
      const senderId = parseInt(formData.get("sender_id") as string, 10);
      const file = formData.get("file") as File | null;
      const messageType = (formData.get("message_type") as string) || "text";
      const content = (formData.get("content") as string) || null;
      const reply_to_id = formData.get("reply_to_id") ? Number(formData.get("reply_to_id")) : null;

      if (!senderId || !receiverId) {
        console.warn("⚠️ Missing sender_id or receiver_id");
        return NextResponse.json({ success: false, error: "Missing sender_id or receiver_id" }, { status: 400 });
      }

      let fileName = null;
      let filePath = null;
      if (file) {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "message");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const uniqueName = `${Date.now()}_${file.name}`;
        const savePath = path.join(uploadDir, uniqueName);
        fs.writeFileSync(savePath, Buffer.from(await file.arrayBuffer()));
        fileName = file.name;
        filePath = `/uploads/message/${uniqueName}`;
      }

      const result = await pool.query(
        `INSERT INTO tblmessage
         (sender_id, receiver_id, content, message_type, file_name, file_path, reply_to_id, status, deleted)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'sent',false)
         RETURNING *`,
        [senderId, receiverId, content, messageType, fileName, filePath, reply_to_id]
      );

      const row = result.rows[0];
      const message = {
        ...row,
        created_at_local: toLocalISOString(row.created_at, tzOffsetMinutes),
      };

      console.log("📦 [message:new] Ready to emit via socket server");

      // ✅ Emit to socket server via /emit endpoint
      try {
        const emitRes = await fetch("https://soulsync-socket-server.onrender.com/emit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "message:new", data: message }),
        });
        console.log("📤 Emit sent, response:", emitRes.status);
      } catch (err) {
        console.error("❌ Emit failed:", err);
      }

      return NextResponse.json(message, { status: 201 });
    }

    // 🟢 Handle JSON/text message
    const body = await req.json();
    const { sender_id, content, message_type, file_name, file_path, reply_to_id } = body;
    console.log("🗨️ JSON message from:", sender_id, "→", receiverId);

    const result = await pool.query(
      `INSERT INTO tblmessage
       (sender_id,receiver_id,content,message_type,file_name,file_path,reply_to_id,status,deleted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'sent',false)
       RETURNING *`,
      [sender_id, receiverId, content, message_type || "text", file_name, file_path, reply_to_id]
    );

    const row = result.rows[0];
    const message = {
      ...row,
      created_at_local: toLocalISOString(row.created_at, tzOffsetMinutes),
    };

    console.log("📦 [message:new] Inserting done. Sending emit...");

    try {
      const emitRes = await fetch("https://soulsync-socket-server.onrender.com/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "message:new", data: message }),
      });
      console.log("📤 Emit sent (status):", emitRes.status);
    } catch (err) {
      console.error("❌ Emit failed:", err);
    }

    return NextResponse.json(message, { status: 201 });
  } catch (err: any) {
    console.error("❌ [POST /api/messages] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------
   ✅ PATCH /api/messages/[id]
----------------------------------------------------- */
export async function PATCH(req: Request) {
  console.log("🟡 [PATCH /api/messages] Request received");
  try {
    const url = new URL(req.url);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);
    const { message_id, status, content, emoji_reactions } = await req.json();

    const pool = getPool();
    let query = "";
    let params: any[] = [];

    if (content) {
      query = `UPDATE tblmessage SET content=$1,edited=true,edited_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`;
      params = [content, message_id];
    } else if (status) {
      query = `UPDATE tblmessage SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`;
      params = [status, message_id];
    } else if (emoji_reactions) {
      query = `UPDATE tblmessage SET emoji_reactions=$1::jsonb,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`;
      params = [JSON.stringify(emoji_reactions), message_id];
    }

    const result = await pool.query(query, params);
    const message = {
      ...result.rows[0],
      created_at_local: toLocalISOString(result.rows[0].created_at, tzOffsetMinutes),
    };

    console.log("📦 [message:update] Updating done, emitting...");

    try {
      const emitRes = await fetch("https://soulsync-socket-server.onrender.com/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "message:update", data: message }),
      });
      console.log("📤 Emit sent (status):", emitRes.status);
    } catch (err) {
      console.error("❌ Emit failed:", err);
    }

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    console.error("❌ [PATCH /api/messages] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------
   ✅ DELETE /api/messages/[id]
----------------------------------------------------- */
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  console.log("🔴 [DELETE /api/messages] Request received");
  try {
    const params = await context.params;
    const pool = getPool();

    await pool.query(`UPDATE tblmessage SET deleted=true,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [params.id]);
    console.log("🗑️ Message soft-deleted:", params.id);

    try {
      const emitRes = await fetch("https://soulsync-socket-server.onrender.com/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "message:delete", data: { id: params.id } }),
      });
      console.log("📤 Emit delete sent:", emitRes.status);
    } catch (err) {
      console.error("❌ Emit failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ [DELETE /api/messages] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
