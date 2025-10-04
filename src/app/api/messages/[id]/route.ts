// src/app/api/messages/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import fs from "fs";
import path from "path";

// ✅ Helper: determine online status
function isUserOnline(lastActive: string | null, thresholdMs = 30_000) {
  if (!lastActive) return false;
  const last = new Date(lastActive).getTime();
  return Date.now() - last <= thresholdMs;
}

// ✅ Helper: convert UTC to client local time
function toLocalISOString(dateStr: string | null, tzOffsetMinutes: number) {
  if (!dateStr || isNaN(tzOffsetMinutes)) return dateStr;
  const date = new Date(dateStr);
  date.setMinutes(date.getMinutes() - tzOffsetMinutes);
  return date.toISOString();
}

// ✅ GET: Fetch messages + receiver info + reply
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(req.url);

    const senderId = parseInt(url.searchParams.get("sender_id") || "0", 10);
    const receiverId = parseInt(id, 10);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);

    if (!senderId || !receiverId) {
      return NextResponse.json(
        { success: false, error: "Missing sender_id or receiver_id" },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Fetch messages with optional reply info
    const messagesResult = await pool.query(
      `
      SELECT 
        m.id, m.sender_id, m.receiver_id,
        m.content, m.message_type,
        m.file_name, m.file_path,
        m.status, m.created_at,
        r.id AS reply_to_id, r.content AS reply_content, r.sender_id AS reply_sender_id
      FROM tblmessage m
      LEFT JOIN tblmessage r ON m.reply_to_id = r.id
      WHERE (m.sender_id = $1 AND m.receiver_id = $2)
         OR (m.sender_id = $2 AND m.receiver_id = $1)
      ORDER BY m.created_at ASC
      `,
      [senderId, receiverId]
    );

    const messages = messagesResult.rows.map((msg: any) => ({
      ...msg,
      created_at_local: toLocalISOString(msg.created_at, tzOffsetMinutes),
      reply: msg.reply_to_id
        ? {
            id: msg.reply_to_id,
            content: msg.reply_content,
            sender_id: msg.reply_sender_id,
          }
        : null,
    }));

    console.log("📨 GET Messages:", messages);

    // Fetch receiver info
    const userResult = await pool.query(
      `
      SELECT id, username, photo_file_path as photo, last_active
      FROM tbluser
      WHERE id = $1
      `,
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
          isOnline: isUserOnline(last_active_local),
        }
      : null;

    return NextResponse.json({ messages, receiver });
  } catch (err: any) {
    console.error("❌ GET Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch messages", details: err.message },
      { status: 500 }
    );
  }
}

// ✅ POST: Send message (text, file, or reply)
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const receiverId = parseInt(id, 10);
    const url = new URL(req.url);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);
    const pool = getPool();

    const contentType = req.headers.get("content-type") || "";

    // Handle file upload (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const senderId = parseInt(formData.get("sender_id") as string, 10);
      const file = formData.get("file") as File | null;
      const messageType = (formData.get("message_type") as string) || "text";
      const content = (formData.get("content") as string) || null;
      const reply_to_id = formData.get("reply_to_id")
        ? Number(formData.get("reply_to_id"))
        : null;

      console.log("📩 Incoming multipart:", {
        senderId,
        receiverId,
        content,
        messageType,
        reply_to_id,
        file: file ? file.name : null,
      });

      if (!senderId || !receiverId) {
        return NextResponse.json(
          { success: false, error: "Missing sender_id or receiver_id" },
          { status: 400 }
        );
      }

      let fileName = null;
      let filePath = null;

      if (file) {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "message");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const uniqueName = `${Date.now()}_${file.name}`;
        const savePath = path.join(uploadDir, uniqueName);

        const bytes = await file.arrayBuffer();
        fs.writeFileSync(savePath, Buffer.from(bytes));

        fileName = file.name;
        filePath = `/uploads/message/${uniqueName}`;
      }

      const result = await pool.query(
        `
        INSERT INTO tblmessage
        (sender_id, receiver_id, content, message_type, file_name, file_path, reply_to_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent')
        RETURNING *
        `,
        [senderId, receiverId, content, messageType, fileName, filePath, reply_to_id]
      );

      const row = result.rows[0];
      console.log("✅ Saved multipart message:", row);
      return NextResponse.json(
        { ...row, created_at_local: toLocalISOString(row.created_at, tzOffsetMinutes) },
        { status: 201 }
      );
    }

    // Handle JSON/text messages
    const body = await req.json();
    const { sender_id, content, message_type, file_name, file_path, reply_to_id } = body;

    console.log("📩 Incoming JSON:", body);

    if (!sender_id || !receiverId) {
      return NextResponse.json(
        { success: false, error: "Missing sender_id or receiver_id" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO tblmessage
      (sender_id, receiver_id, content, message_type, file_name, file_path, reply_to_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent')
      RETURNING *
      `,
      [sender_id, receiverId, content || null, message_type || "text", file_name || null, file_path || null, reply_to_id || null]
    );

    const row = result.rows[0];
    console.log("✅ Saved JSON message:", row);
    return NextResponse.json(
      { ...row, created_at_local: toLocalISOString(row.created_at, tzOffsetMinutes) },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("❌ POST Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to send message", details: err.message },
      { status: 500 }
    );
  }
}

// ✅ PATCH: Update message status
export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);

    const { message_id, status } = await req.json();
    if (!message_id || !status) {
      return NextResponse.json(
        { success: false, error: "Missing message_id or status" },
        { status: 400 }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      `UPDATE tblmessage SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, message_id]
    );

    const row = result.rows[0];
    console.log("✅ Status updated:", row);
    return NextResponse.json({
      ...row,
      created_at_local: toLocalISOString(row.created_at, tzOffsetMinutes),
    });
  } catch (err: any) {
    console.error("❌ PATCH Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update status", details: err.message },
      { status: 500 }
    );
  }
}
