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
    const nowUtc = new Date().toISOString(); // ✅ UTC timestamp

    // 🧩 Return cached icebreaker if not regenerating
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

    // 🧭 Fetch user data
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

    // 💞 Interests
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

    // 🚫 Avoid repetition
    const previous = await pool.query(
      `SELECT icebreaker FROM tblicebreaker 
       WHERE sender_id = $1 AND receiver_id = $2 
       ORDER BY created_at DESC LIMIT 3`,
      [sender_id, receiver_id]
    );
    const recentTexts = previous.rows.map((r) => r.icebreaker).join(" || ");

    // ✨ Creative focus
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

    // 🧠 AI prompt
    const prompt = `
You are "SoulSync AI" — a charming, emotionally intelligent assistant helping users start fun and natural conversations.

Generate a short and engaging **icebreaker message** that ${sender.username} could send to ${receiver.username}.

💫 Context:
- Sender: ${sender.username} from ${sender.city || "Unknown"}, ${sender.country || "Unknown"}
- Receiver: ${receiver.username} from ${receiver.city || "Unknown"}, ${receiver.country || "Unknown"}
- Sender Bio: ${sender.quote || "No bio"}
- Receiver Bio: ${receiver.quote || "No bio"}
- Sender Zodiac: ${sender.zodiac || "Unknown"}
- Receiver Zodiac: ${receiver.zodiac || "Unknown"}
- Shared Interests: ${sharedInterests.length ? sharedInterests.join(", ") : "None"}

🎯 Focus on ${focus}.
Avoid generic greetings like “Hi” or “Hello.”  
Keep it under 40 words.  
Make it sound natural, curious, playful, and personal — like a real message someone might send on a dating app.  
Avoid repeating these past icebreakers: ${recentTexts || "None"}.
`;

    console.log("🧊 AI Icebreaker Prompt:\n", prompt);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 1.1,
      max_tokens: 80,
    });

    const icebreaker =
      completion.choices[0]?.message?.content?.trim() ||
      `You caught my attention, ${receiver.username} — your profile feels unique. What’s something that makes you happiest these days?`;

    console.log("🧊 New Pro+ Icebreaker:", icebreaker);

    // 💾 Save to DB
    const saveResult = await pool.query(
      `INSERT INTO tblicebreaker (sender_id, receiver_id, icebreaker, generated_by, used, created_at)
       VALUES ($1, $2, $3, 'AI', false, $4)
       RETURNING *`,
      [sender_id, receiver_id, icebreaker, nowUtc]
    );
    const savedIcebreaker = saveResult.rows[0];

    // 💬 Log in message history
    const msgResult = await pool.query(
      `INSERT INTO tblmessage (sender_id, receiver_id, content, message_type, status, deleted, generated_by, created_at, updated_at)
       VALUES ($1, $2, $3, 'ai_icebreaker', 'sent', false, 'ai', $4, $4)
       RETURNING *`,
      [sender_id, receiver_id, icebreaker, nowUtc]
    );
    const message = msgResult.rows[0];

    // 📡 Emit via socket
    try {
      await fetch("https://soulsync-socket-server.onrender.com/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "message:new",
          data: message,
        }),
      });
      console.log("📤 [SOCKET] Icebreaker emitted");
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
      created_at_utc: nowUtc,
    });
  } catch (error: any) {
    console.error("❌ Error generating icebreaker:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
