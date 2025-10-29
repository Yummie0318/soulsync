export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

/**
 * ✅ POST /api/messages/[id]/reaction
 * Replace user's emoji reaction (only one per user per message)
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const pool = getPool();
  const messageId = parseInt(params.id, 10);

  try {
    const { emoji, user_id } = await req.json();

    if (!emoji || !user_id || !messageId) {
      return NextResponse.json(
        { success: false, error: "Missing emoji, user_id, or message_id" },
        { status: 400 }
      );
    }

    // 🟢 1. Get existing reactions
    const existing = await pool.query(
      "SELECT emoji_reactions FROM tblmessage WHERE id = $1",
      [messageId]
    );
    const currentReactions = existing.rows[0]?.emoji_reactions || [];

    // 🟢 2. Remove old reaction by this user
    let updatedReactions = currentReactions.filter((r: any) => r.user_id !== user_id);

    // 🟢 3. Toggle or add new reaction
    const userOldReaction = currentReactions.find((r: any) => r.user_id === user_id);
    if (!userOldReaction || userOldReaction.emoji !== emoji) {
      const userRes = await pool.query(
        "SELECT username FROM tbluser WHERE id = $1",
        [user_id]
      );
      const username = userRes.rows[0]?.username || "Unknown";
      updatedReactions.push({ emoji, user_id, username });
    }

    // 🟢 4. Save back to DB with UTC timestamp
    const nowUtc = new Date().toISOString(); // UTC timestamp
    const result = await pool.query(
      `
      UPDATE tblmessage
      SET emoji_reactions = $1::jsonb,
          updated_at = $2
      WHERE id = $3
      RETURNING id, sender_id, receiver_id, emoji_reactions
      `,
      [JSON.stringify(updatedReactions), nowUtc, messageId]
    );

    const updatedRow = result.rows[0];

    // 🟢 5. Emit via /emit endpoint
    try {
      await fetch("https://soulsync-socket-server.onrender.com/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "message:reaction",
          data: {
            message_id: updatedRow.id,
            sender_id: updatedRow.sender_id,
            receiver_id: updatedRow.receiver_id,
            emoji_reactions: updatedRow.emoji_reactions,
            updated_at: nowUtc, // include UTC timestamp
          },
        }),
      });
      console.log("📤 [message:reaction] Emit sent");
    } catch (emitErr) {
      console.error("❌ Emit failed:", emitErr);
    }

    return NextResponse.json({
      success: true,
      message_id: updatedRow.id,
      emoji_reactions: updatedRow.emoji_reactions,
      updated_at: nowUtc, // send UTC timestamp to client
    });
  } catch (err: any) {
    console.error("❌ [API] /api/messages/[id]/reaction Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update emoji reactions",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
