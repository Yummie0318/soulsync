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

  // add tz offset minutes to get local time ISO
  date.setMinutes(date.getMinutes() + tzOffsetMinutes);

  return date.toISOString();
}

/* -----------------------------------------------------
   🔹 Helper: emit event to socket server
----------------------------------------------------- */
async function emitSocket(event: string, data: any) {
  try {
    const emitRes = await fetch("https://soulsync-socket-server.onrender.com/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data }),
    });
    console.log(`📤 Emit '${event}' sent (${emitRes.status})`);
  } catch (err) {
    console.error("❌ Socket emit failed:", err);
  }
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

    if (!senderId || !receiverId) {
      console.warn("⚠️ Missing sender_id or receiver_id");
      return NextResponse.json({ success: false, error: "Missing sender_id or receiver_id" }, { status: 400 });
    }

    const pool = getPool();

    // mark unread messages as read (incoming to receiver from this sender)
    const unreadResult = await pool.query(
      `SELECT COUNT(*) AS unread_count
       FROM tblmessage
       WHERE sender_id = $2 AND receiver_id = $1 AND status != 'read' AND deleted = false`,
      [senderId, receiverId]
    );
    const unreadCount = parseInt(unreadResult.rows[0]?.unread_count || "0", 10);

    if (unreadCount > 0) {
      await pool.query(
        `UPDATE tblmessage
         SET status = 'read', updated_at = CURRENT_TIMESTAMP
         WHERE sender_id = $2 AND receiver_id = $1 AND status != 'read' AND deleted = false`,
        [senderId, receiverId]
      );
      console.log(`✅ Marked ${unreadCount} messages as read`);
    }

    // include generated_by in SELECT so front-end can detect AI messages
    const messagesResult = await pool.query(
      `SELECT 
         m.id,
         m.sender_id,
         m.receiver_id,
         m.content,
         m.message_type,
         m.file_name,
         m.file_path,
         m.status,
         m.emoji_reactions,
         m.schedule_id,
         m.schedule_status,
        m.rescheduled_date,  -- ✅ fixed
         m.created_at,
         m.edited,
         m.edited_at,
         m.deleted,
         m.generated_by,
         r.id AS reply_to_id,
         r.content AS reply_content,
         r.sender_id AS reply_sender_id
       FROM tblmessage m
       LEFT JOIN tblmessage r ON m.reply_to_id = r.id
       WHERE (
         (m.sender_id = $1 AND m.receiver_id = $2)
         OR (m.sender_id = $2 AND m.receiver_id = $1)
       )
       AND m.deleted = false
       ORDER BY m.created_at ASC`,
      [senderId, receiverId]
    );
    
    
    console.log(`💬 Loaded ${messagesResult.rows.length} messages`);

    const messages = messagesResult.rows.map((msg: any) => ({
      ...msg,
      // convert times to local ISO for client
      created_at_local: toLocalISOString(msg.created_at, tzOffsetMinutes),
      edited_at_local: msg.edited_at ? toLocalISOString(msg.edited_at, tzOffsetMinutes) : null,
      reply: msg.reply_to_id ? { id: msg.reply_to_id, content: msg.reply_content, sender_id: msg.reply_sender_id } : null,
    }));

    const userResult = await pool.query(
      `SELECT id, username, photo_file_path AS photo, last_active
       FROM tbluser
       WHERE id = $1`,
      [receiverId]
    );
    const receiverRow = userResult.rows[0];
    const receiver = receiverRow
      ? {
          id: receiverRow.id,
          username: receiverRow.username,
          photo: receiverRow.photo || null,
          last_active: receiverRow.last_active,
          last_active_local: toLocalISOString(receiverRow.last_active, tzOffsetMinutes),
          isOnline: isUserOnline(receiverRow.last_active),
        }
      : null;

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
   - supports generated_by column (ai | user)
   - supports multipart/form-data and JSON
----------------------------------------------------- */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  console.log("🟢 [POST /api/messages] Request received");
  try {
    const params = await context.params;
    const receiverId = parseInt(params.id, 10);
    const pool = getPool();
    const url = new URL(req.url);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);

    const contentType = (req.headers.get("content-type") || "").toLowerCase();

    // ---- multipart/form-data (file upload) ----
    if (contentType.includes("multipart/form-data")) {
      console.log("📂 Multipart upload detected");
      const formData = await req.formData();
      const senderId = parseInt((formData.get("sender_id") as string) || "0", 10);
      const file = formData.get("file") as File | null;
      const messageType = (formData.get("message_type") as string) || "text";
      const content = (formData.get("content") as string) || null;
      const reply_to_id = formData.get("reply_to_id") ? Number(formData.get("reply_to_id")) : null;
      const generated_by_field = formData.get("generated_by");
      const generated_by = typeof generated_by_field === "string" ? generated_by_field : (generated_by_field ? String(generated_by_field) : "user");

      if (!senderId || !receiverId) {
        return NextResponse.json({ success: false, error: "Missing sender_id or receiver_id" }, { status: 400 });
      }

      // Save file to disk
      let fileName: string | null = null;
      let filePath: string | null = null;
      if (file) {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "message");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const uniqueName = `${Date.now()}_${(file as any).name ?? "upload"}`;
        const savePath = path.join(uploadDir, uniqueName);
        fs.writeFileSync(savePath, Buffer.from(await (file as File).arrayBuffer()));
        fileName = (file as any).name || uniqueName;
        filePath = `/uploads/message/${uniqueName}`;
      }

      const insertRes = await pool.query(
        `INSERT INTO tblmessage
         (sender_id, receiver_id, content, message_type, file_name, file_path, reply_to_id, status, deleted, generated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'sent',false,$8)
         RETURNING *`,
        [senderId, receiverId, content, messageType, fileName, filePath, reply_to_id, generated_by]
      );

      const row = insertRes.rows[0];
      const message = { ...row, created_at_local: toLocalISOString(row.created_at, tzOffsetMinutes) };

      await emitSocket("message:new", message);
      return NextResponse.json(message, { status: 201 });
    }

    // ---- JSON payload (text / ai) ----
    const body = await req.json();
    const {
      sender_id,
      content,
      message_type,
      file_name,
      file_path,
      reply_to_id,
      generated_by,
    } = body;

    if (!sender_id || !receiverId) {
      return NextResponse.json({ success: false, error: "Missing sender_id or receiver_id" }, { status: 400 });
    }

    // default to 'user' when not provided
    const generatedBy = generated_by || "user";
    console.log("🗨️ JSON message from:", sender_id, "→", receiverId, "generated_by:", generatedBy);

    const insertResult = await pool.query(
      `INSERT INTO tblmessage
       (sender_id,receiver_id,content,message_type,file_name,file_path,reply_to_id,status,deleted,generated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'sent',false,$8)
       RETURNING *`,
      [sender_id, receiverId, content, message_type || "text", file_name, file_path, reply_to_id, generatedBy]
    );

    const row = insertResult.rows[0];
    const message = { ...row, created_at_local: toLocalISOString(row.created_at, tzOffsetMinutes) };

// send normal socket event
await emitSocket("message:new", message);

// also emit special event if scheduler
if (message.message_type === "scheduler") {
  await emitSocket("datescheduler:new", message);
}

return NextResponse.json(message, { status: 201 });
  } catch (err: any) {
    console.error("❌ [POST /api/messages] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------
   ✅ PATCH /api/messages/[id]
   - supports update of content, status, emoji_reactions
----------------------------------------------------- */
export async function PATCH(req: Request) {
  console.log("🟡 [PATCH /api/messages] Request received");
  try {
    const url = new URL(req.url);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);
    const { message_id, status, content, emoji_reactions, generated_by } = await req.json();

    const pool = getPool();
    let query = "";
    let params: any[] = [];

    // permit updating content, status, emoji_reactions, generated_by if passed
    if (content) {
      query = `UPDATE tblmessage SET content=$1, edited=true, edited_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`;
      params = [content, message_id];
    } else if (status) {
      query = `UPDATE tblmessage SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`;
      params = [status, message_id];
    } else if (emoji_reactions) {
      query = `UPDATE tblmessage SET emoji_reactions=$1::jsonb, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`;
      params = [JSON.stringify(emoji_reactions), message_id];
    } else if (generated_by) {
      query = `UPDATE tblmessage SET generated_by=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`;
      params = [generated_by, message_id];
    } else {
      return NextResponse.json({ success: false, error: "No valid update payload provided" }, { status: 400 });
    }

    const result = await pool.query(query, params);
    const updatedRow = result.rows[0];
    const message = { ...updatedRow, created_at_local: toLocalISOString(updatedRow.created_at, tzOffsetMinutes) };

    await emitSocket("message:update", message);
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

    await pool.query(`UPDATE tblmessage SET deleted=true, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [params.id]);
    console.log("🗑️ Message soft-deleted:", params.id);

    await emitSocket("message:delete", { id: params.id });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ [DELETE /api/messages] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
