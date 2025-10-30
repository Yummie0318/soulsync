export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

/* -----------------------------------------------------
   ✅ GET /api/conversation/theme?conversationKey=113_114
   Fetch the saved background theme for this conversation
----------------------------------------------------- */
export async function GET(req: Request) {
  console.log("🟢 [GET /api/conversation/theme] Request received");

  try {
    const url = new URL(req.url);
    const conversationKey = url.searchParams.get("conversationKey");

    if (!conversationKey) {
      return NextResponse.json(
        { success: false, error: "Missing conversationKey" },
        { status: 400 }
      );
    }

    const pool = getPool();

    const result = await pool.query(
      `SELECT id, conversation_key, background_type, background_value, updated_by, updated_at
       FROM tblconversation_theme
       WHERE conversation_key = $1
       LIMIT 1`,
      [conversationKey]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: true, theme: null });
    }

    console.log(`🎨 Theme found for ${conversationKey}`);
    return NextResponse.json({ success: true, theme: result.rows[0] });
  } catch (err: any) {
    console.error("❌ [GET /api/conversation/theme] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------
   ✅ POST /api/conversation/theme
   Body: {
     conversationKey: "113_114",
     background_type: "color" | "image" | "default",
     background_value: "#1e1e2f" | "https://cdn.app/bg.png",
     updated_by: 113
   }

   - Only one record per conversation
   - Update if exists, insert otherwise
   - Notify both users in the conversation via socket
----------------------------------------------------- */
export async function POST(req: Request) {
  console.log("🟢 [POST /api/conversation/theme] Request received");

  try {
    const body = await req.json();
    const { conversationKey, background_type, background_value, updated_by } = body;

    if (!conversationKey || !updated_by) {
      return NextResponse.json(
        { success: false, error: "Missing conversationKey or updated_by" },
        { status: 400 }
      );
    }

    const pool = getPool();

    // 🔍 Check if theme already exists
    const check = await pool.query(
      `SELECT id FROM tblconversation_theme WHERE conversation_key = $1 LIMIT 1`,
      [conversationKey]
    );

    let result;
    if (check.rows.length > 0) {
      // 🟡 Update existing record
      console.log(`🔄 Updating theme for conversation ${conversationKey}`);
      result = await pool.query(
        `UPDATE tblconversation_theme
         SET background_type = $1,
             background_value = $2,
             updated_by = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE conversation_key = $4
         RETURNING *`,
        [background_type || "default", background_value || null, updated_by, conversationKey]
      );
    } else {
      // 🟢 Insert new record
      console.log(`✨ Creating new theme for conversation ${conversationKey}`);
      result = await pool.query(
        `INSERT INTO tblconversation_theme
         (conversation_key, background_type, background_value, updated_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [conversationKey, background_type || "default", background_value || null, updated_by]
      );
    }

    const updatedTheme = result.rows[0];

    // -----------------------------------------------------
    // 📡 Emit socket event to BOTH participants (e.g. 113, 114)
    // -----------------------------------------------------
    try {
      const [user1, user2] = conversationKey.split("_");
      const response = await fetch("https://soulsync-socket-server.onrender.com/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "conversation:theme:update",
          data: {
            conversationKey,
            theme: updatedTheme,
            users: [user1, user2],
          },
        }),
      });

      if (!response.ok) {
        console.error("⚠️ [SOCKET] Server returned non-OK response:", response.status);
      } else {
        console.log("📡 [SOCKET] Theme update emitted successfully:", {
          conversationKey,
          users: [user1, user2],
        });
      }
    } catch (err) {
      console.error("⚠️ [SOCKET] Failed to emit theme update:", err);
    }

    // ✅ Return updated theme to client
    return NextResponse.json(
      { success: true, theme: updatedTheme },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("❌ [POST /api/conversation/theme] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
