// src/app/api/messages/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import fs from "fs";
import path from "path";

// ✅ GET: Fetch all messages between logged-in user & another user
export async function GET(
  req: Request,
  { params }: { params: { id: string } } // receiver_id
) {
  try {
    const url = new URL(req.url);
    const senderId = parseInt(url.searchParams.get("sender_id") || "0", 10);
    const receiverId = parseInt(params.id, 10);

    if (!senderId || !receiverId) {
      return NextResponse.json(
        { success: false, error: "Missing sender_id or receiver_id" },
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
        m.status, m.created_at
      FROM tblmessage m
      WHERE (m.sender_id = $1 AND m.receiver_id = $2)
         OR (m.sender_id = $2 AND m.receiver_id = $1)
      ORDER BY m.created_at ASC
      `,
      [senderId, receiverId]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch messages", details: err.message },
      { status: 500 }
    );
  }
}

// ✅ POST: Send message (text, image, video, audio, file)
export async function POST(
  req: Request,
  { params }: { params: { id: string } } // receiver_id
) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 🔹 Handle file upload (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const senderId = parseInt(formData.get("sender_id") as string, 10);
      const receiverId = parseInt(params.id, 10);
      const file = formData.get("file") as File | null;
      const messageType = (formData.get("message_type") as string) || "text";
      const content = (formData.get("content") as string) || null;

      if (!senderId || !receiverId) {
        return NextResponse.json(
          { success: false, error: "Missing sender_id or receiver_id" },
          { status: 400 }
        );
      }

      let fileName = null;
      let filePath = null;

      if (file) {
        // ensure upload folder exists
        const uploadDir = path.join(process.cwd(), "public", "uploads", "message");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // generate unique filename
        const uniqueName = `${Date.now()}_${file.name}`;
        const savePath = path.join(uploadDir, uniqueName);

        // write file to disk
        const bytes = await file.arrayBuffer();
        fs.writeFileSync(savePath, Buffer.from(bytes));

        fileName = file.name;
        // public-facing path (used in <img src>)
        filePath = `/uploads/message/${uniqueName}`;
      }

      const pool = getPool();
      const result = await pool.query(
        `
        INSERT INTO tblmessage (sender_id, receiver_id, content, message_type, file_name, file_path, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'sent')
        RETURNING *
        `,
        [senderId, receiverId, content, messageType, fileName, filePath]
      );

      return NextResponse.json(result.rows[0], { status: 201 });
    }

    // 🔹 Handle JSON payload (text-only messages)
    const body = await req.json();
    const { sender_id, content, message_type, file_name, file_path } = body;
    const receiver_id = parseInt(params.id, 10);

    if (!sender_id || !receiver_id) {
      return NextResponse.json(
        { success: false, error: "Missing sender_id or receiver_id" },
        { status: 400 }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      `
      INSERT INTO tblmessage (sender_id, receiver_id, content, message_type, file_name, file_path, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'sent')
      RETURNING *
      `,
      [
        sender_id,
        receiver_id,
        content || null,
        message_type || "text",
        file_name || null,
        file_path || null,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Failed to send message", details: err.message },
      { status: 500 }
    );
  }
}

// ✅ PATCH: Update message status (delivered / read)
export async function PATCH(req: Request) {
  try {
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

    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Failed to update status", details: err.message },
      { status: 500 }
    );
  }
}
