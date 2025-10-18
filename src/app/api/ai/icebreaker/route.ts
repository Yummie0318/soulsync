export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import getPool from "@/lib/db";

export async function POST(req: Request) {
  console.log("🧊 [POST /api/icebreaker] Pro+ Request received...");

  try {
    const { sender_id, receiver_id, regenerate } = await req.json();

    if (!sender_id || !receiver_id) {
      return NextResponse.json(
        { success: false, error: "Missing sender_id or receiver_id" },
        { status: 400 }
      );
    }

    const pool = getPool();

    // 🧠 Prevent showing the same one if user is just reopening chat
    if (regenerate === false) {
      const existing = await pool.query(
        `SELECT * FROM tblicebreaker 
         WHERE sender_id = $1 AND receiver_id = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [sender_id, receiver_id]
      );
      if (existing.rows.length > 0) {
        console.log("🧊 Returning cached icebreaker...");
        return NextResponse.json({
          success: true,
          icebreaker: existing.rows[0].icebreaker,
          from_cache: true,
        });
      }
    }

    // Fetch sender + receiver with zodiac + country
    const senderData = await pool.query(
      `SELECT u.username, u.quote, u.city, z.zodiac, c.country
       FROM tbluser u
       LEFT JOIN tblzodiac z ON u.zodiac_id = z.id
       LEFT JOIN tblcountry c ON u.country_id = c.id
       WHERE u.id = $1`,
      [sender_id]
    );
    const receiverData = await pool.query(
      `SELECT u.username, u.quote, u.city, z.zodiac, c.country
       FROM tbluser u
       LEFT JOIN tblzodiac z ON u.zodiac_id = z.id
       LEFT JOIN tblcountry c ON u.country_id = c.id
       WHERE u.id = $1`,
      [receiver_id]
    );

    const sender = senderData.rows[0];
    const receiver = receiverData.rows[0];

    if (!sender || !receiver) {
      return NextResponse.json(
        { success: false, error: "Sender or receiver not found" },
        { status: 404 }
      );
    }

    // Interests
    const senderInterests = await pool.query(
      `SELECT i.interest 
       FROM tblinterest_user iu
       JOIN tblinterest i ON iu.interest_id = i.id
       WHERE iu.user_id = $1`,
      [sender_id]
    );
    const receiverInterests = await pool.query(
      `SELECT i.interest 
       FROM tblinterest_user iu
       JOIN tblinterest i ON iu.interest_id = i.id
       WHERE iu.user_id = $1`,
      [receiver_id]
    );

    const senderInterestList = senderInterests.rows.map((i) => i.interest);
    const receiverInterestList = receiverInterests.rows.map((i) => i.interest);
    const sharedInterests = senderInterestList.filter((i) =>
      receiverInterestList.includes(i)
    );

    // 🧩 Look at the last 3 icebreakers to avoid repetition
    const previous = await pool.query(
      `SELECT icebreaker FROM tblicebreaker 
       WHERE sender_id = $1 AND receiver_id = $2 
       ORDER BY created_at DESC LIMIT 3`,
      [sender_id, receiver_id]
    );
    const recentTexts = previous.rows.map((r) => r.icebreaker).join(" || ");

    // 🎯 Dynamic “creative angle” to vary conversation focus
    const creativeFocusOptions = [
      "their interests",
      "their city or culture",
      "their zodiac personality traits",
      "their bio or something intriguing about them",
      "something light and emotionally warm that invites curiosity",
    ];
    const focus =
      creativeFocusOptions[
        Math.floor(Math.random() * creativeFocusOptions.length)
      ];

    // ✨ AI prompt (enhanced for personality and uniqueness)
    const prompt = `
You are "SoulSync AI" — a flirty, witty, emotionally intelligent dating assistant.
Write a short (max 25 words), human-like, and *fresh* icebreaker message.
Avoid repeating anything similar to these past lines: ${recentTexts || "None"}.

Focus this time on ${focus}. 
The message should sound like it’s personally written for the receiver — not generic.

👤 Sender:
- Name: ${sender.username}
- Bio: ${sender.quote || "No bio"}
- City: ${sender.city || "Unknown"}
- Country: ${sender.country || "Unknown"}
- Zodiac: ${sender.zodiac || "Unknown"}
- Interests: ${senderInterestList.join(", ") || "None"}

💖 Receiver:
- Name: ${receiver.username}
- Bio: ${receiver.quote || "No bio"}
- City: ${receiver.city || "Unknown"}
- Country: ${receiver.country || "Unknown"}
- Zodiac: ${receiver.zodiac || "Unknown"}
- Interests: ${receiverInterestList.join(", ") || "None"}

Shared Interests: ${sharedInterests.length ? sharedInterests.join(", ") : "None"}

💡 Guidelines:
- Sound playful and confident
- Ask an interesting or emotional question if possible
- If receiver has interests, make it *about them*
- Avoid repeating gaming-related or generic openings
- No quotes around the text, no emojis unless natural
`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log("💬 Generating dynamic AI icebreaker with focus:", focus);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 1.1, // high creativity for variety
      max_tokens: 80,
    });

    const icebreaker =
      completion.choices[0]?.message?.content?.trim() ||
      `You caught my attention, ${receiver.username} — your profile feels unique. What’s something that makes you happiest these days?`;

    console.log("🧊 New Pro+ Icebreaker:", icebreaker);

    // 💾 Save
    const saveResult = await pool.query(
      `INSERT INTO tblicebreaker (sender_id, receiver_id, icebreaker, generated_by, used)
       VALUES ($1, $2, $3, 'AI', false)
       RETURNING *`,
      [sender_id, receiver_id, icebreaker]
    );

    const savedIcebreaker = saveResult.rows[0];

    // 💬 Log in message history
    const msgResult = await pool.query(
      `INSERT INTO tblmessage (sender_id, receiver_id, content, message_type, status, deleted, generated_by)
       VALUES ($1, $2, $3, 'ai_icebreaker', 'sent', false, 'ai')
       RETURNING *`,
      [sender_id, receiver_id, icebreaker]
    );
    
    const message = msgResult.rows[0];
    

    // 📡 Emit to socket
    try {
      const emitRes = await fetch(
        "https://soulsync-socket-server.onrender.com/emit",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "message:new",
            data: message,
          }),
        }
      );
      console.log("📤 [SOCKET] Icebreaker emitted:", emitRes.status);
    } catch (err) {
      console.error("❌ [SOCKET] Failed to emit icebreaker:", err);
    }

    return NextResponse.json({
      success: true,
      icebreaker,
      focus,
      sharedInterests,
      from_cache: false,
      message,
      savedIcebreaker,
    });
  } catch (error: any) {
    console.error("❌ Error generating icebreaker:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
