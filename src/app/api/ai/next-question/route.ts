// src/app/api/ai/next-question/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import getPool from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 500 });
    }

    const pool = getPool();
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // -----------------------------
    // 1️⃣ Fetch previous answers
    // -----------------------------
    const answersRes = await pool.query(
      `SELECT question_text, answer_text
       FROM tbluser_answers
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [user_id]
    );
    const answers = answersRes.rows;

    // -----------------------------
    // 2️⃣ Fetch user info for context
    // -----------------------------
    const userRes = await pool.query(
      `SELECT gender_id, island_id FROM tbluser WHERE id = $1`,
      [user_id]
    );
    const user = userRes.rows[0];

    // -----------------------------
    // 3️⃣ Generate next AI question
    // -----------------------------
    // Include previous answers and user context
    const questionPrompt = `
      User info:
      - Gender ID: ${user?.gender_id}
      - Island ID: ${user?.island_id}

      User's previous answers:
      ${answers.map(a => `Q: ${a.question_text}\nA: ${a.answer_text}`).join("\n\n")}

      Task:
      - Generate 1 personality question with 4 answer choices.
      - Avoid repeating previous questions.
      - Ensure question is suitable for dating matching (personality, interests, values).
      - Return JSON ONLY in this format:
      {
        "question": {
          "id": "unique-id",
          "text": "Question text",
          "choices": ["Option 1", "Option 2", "Option 3", "Option 4"]
        }
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an AI that generates dating personality questions." },
        { role: "user", content: questionPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message?.content || "{}";
    const data = JSON.parse(raw);

    // -----------------------------
    // 4️⃣ Return question
    // -----------------------------
    return NextResponse.json(data);

  } catch (err: any) {
    console.error("AI Next Question Error:", err);
    return NextResponse.json(
      { error: "Failed to generate next question", details: err.message },
      { status: 500 }
    );
  }
}
