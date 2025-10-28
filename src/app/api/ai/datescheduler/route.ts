// src/app/api/ai/datescheduler/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import getPool from "@/lib/db";

export async function POST(req: Request) {
  console.log("💌 [POST /api/ai/datescheduler] Request received...");

  try {
    const { sender_id, receiver_id, date, location, activity, vibe } =
      await req.json();

    if (!sender_id || !receiver_id || !date) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const pool = getPool();

    // 🔍 Fetch user info
    const [senderRes, receiverRes] = await Promise.all([
      pool.query(
        `SELECT u.username, u.quote, u.city, z.zodiac, c.country
         FROM tbluser u
         LEFT JOIN tblzodiac z ON u.zodiac_id = z.id
         LEFT JOIN tblcountry c ON u.country_id = c.id
         WHERE u.id = $1`,
        [sender_id]
      ),
      pool.query(
        `SELECT u.username, u.quote, u.city, z.zodiac, c.country
         FROM tbluser u
         LEFT JOIN tblzodiac z ON u.zodiac_id = z.id
         LEFT JOIN tblcountry c ON u.country_id = c.id
         WHERE u.id = $1`,
        [receiver_id]
      ),
    ]);

    const sender = senderRes.rows[0];
    const receiver = receiverRes.rows[0];

    if (!sender || !receiver) {
      return NextResponse.json(
        { success: false, error: "Sender or receiver not found" },
        { status: 404 }
      );
    }

    // 🎯 Fetch shared interests
    const [senderInterests, receiverInterests] = await Promise.all([
      pool.query(
        `SELECT i.interest 
         FROM tblinterest_user iu
         JOIN tblinterest i ON iu.interest_id = i.id
         WHERE iu.user_id = $1`,
        [sender_id]
      ),
      pool.query(
        `SELECT i.interest 
         FROM tblinterest_user iu
         JOIN tblinterest i ON iu.interest_id = i.id
         WHERE iu.user_id = $1`,
        [receiver_id]
      ),
    ]);

    const senderInterestList = senderInterests.rows.map((i) => i.interest);
    const receiverInterestList = receiverInterests.rows.map((i) => i.interest);
    const sharedInterests = senderInterestList.filter((i) =>
      receiverInterestList.includes(i)
    );

    // 🧠 AI Prompt
    const prompt = `
You are "SoulSync AI" — a thoughtful, emotionally intelligent date planner.
Design a creative and romantic date plan between these two people.

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

🗓️ Date: ${date}
📍 Location: ${location || "anywhere"}
🎯 Activity: ${activity || "any activity"}
💫 Vibe: ${vibe || "romantic and fun"}

💡 Guidelines:
- Keep it under 200 words
- Make it personal, sweet, and realistic
- Reference their shared interests or zodiac if fitting
- Write in a warm and conversational tone
`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log("🤖 Generating AI Date Plan...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 1,
      max_tokens: 400,
    });

    const aiPlan =
      completion.choices[0]?.message?.content?.trim() ||
      "Could not generate a plan at the moment.";

    console.log("💌 AI Plan Generated!");

    // 💾 Insert schedule (default: pending)
    const scheduleRes = await pool.query(
      `INSERT INTO tblaischedule 
         (sender_id, receiver_id, proposed_date, location, activity, vibe, ai_plan, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [sender_id, receiver_id, date, location, activity, vibe, aiPlan]
    );

    const schedule = scheduleRes.rows[0];

    // 💬 Insert message referencing schedule
    const msgRes = await pool.query(
      `INSERT INTO tblmessage 
       (sender_id, receiver_id, content, message_type, status, deleted, generated_by, schedule_id, schedule_status)
       VALUES ($1, $2, $3, 'ai_schedule', 'sent', false, 'ai', $4, 'pending')
       RETURNING *`,
      [
        sender_id,
        receiver_id,
        `💌 AI Date Proposal\n📅 ${date}\n📍 ${location}\n🎯 ${activity}\n💫 ${vibe}\n\n${aiPlan}`,
        schedule.id,
      ]
    );

    const message = msgRes.rows[0];

    // 🔗 Back-link tblaischedule.ai_message_id
    await pool.query(
      `UPDATE tblaischedule 
       SET ai_message_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [message.id, schedule.id]
    );

    return NextResponse.json({
      success: true,
      message: "AI schedule created successfully.",
      schedule,
      messageData: message,
      aiPlan,
      sharedInterests,
    });
  } catch (err: any) {
    console.error("❌ [AI Scheduler Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// -------------------- GET Handler --------------------
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "user_id is required" },
        { status: 400 }
      );
    }

    const pool = getPool();

    const res = await pool.query(
      `SELECT * FROM tblaischedule
       WHERE sender_id = $1 OR receiver_id = $1
       ORDER BY proposed_date DESC`,
      [userId]
    );

    return NextResponse.json({ success: true, schedules: res.rows });
  } catch (err: any) {
    console.error("❌ [AI Scheduler GET Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
