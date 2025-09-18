// C:\Users\Yummie03\Desktop\soulsyncai\src\app\api\ai\save-answer\route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Updates the user's compatibility score on tbluser
 */
async function updateUserCompatibility(pool: any, user_id: number, compatibility_score: number) {
  await pool.query(
    `UPDATE tbluser
     SET compatibility_score = $1
     WHERE id = $2`,
    [compatibility_score, user_id]
  );
  console.log(`✨ Updated tbluser.compatibility_score for user ${user_id}: ${compatibility_score}`);
}

export async function POST(req: Request) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error("❌ DB connection error (save-answer):", err);
    return NextResponse.json({ error: "Database not ready" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { user_id, question_text, answer_text } = body;

    if (!user_id || !question_text || !answer_text) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1️⃣ Create embedding for the answer
    const embeddingResp = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: answer_text,
    });
    const answerEmbedding = embeddingResp.data[0].embedding;

    // Log embedding info
    console.log(`🔎 Embedding generated for user ${user_id}`);
    console.log(`   Length: ${answerEmbedding.length}`);
    console.log(`   First 5 values: ${answerEmbedding.slice(0, 5)}`);
    console.log(`   Last 5 values: ${answerEmbedding.slice(-5)}`);

    if (answerEmbedding.length !== 1536) {
      console.error(
        `⚠️ Embedding length mismatch: expected 1536, got ${answerEmbedding.length}`
      );
    }

    // 2️⃣ Save answer into tbluser_answers
    await pool.query(
      `INSERT INTO tbluser_answers (user_id, question_text, answer_text, answer_embedding, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [user_id, question_text, answer_text, answerEmbedding]
    );

    // 3️⃣ Fetch all answers so far
    const answersRes = await pool.query(
      `SELECT question_text, answer_text
       FROM tbluser_answers
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [user_id]
    );
    const answers = answersRes.rows;

    // 4️⃣ Generate / update AI analysis
    const analysisPrompt = `
      User's answers so far:
      ${answers.map(a => `Q: ${a.question_text}\nA: ${a.answer_text}`).join("\n\n")}

      Task:
      - Summarize personality & values.
      - Extract 3–5 core values as an array.
      - Estimate compatibility readiness score (0–100%).
      - Return JSON with:
      {
        "summary": "...",
        "core_values": ["...","..."],
        "compatibility_score": 87
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a matchmaking AI assistant." },
        { role: "user", content: analysisPrompt }
      ],
      response_format: { type: "json_object" },
    });

    const analysisText = completion.choices[0].message?.content;
    const analysis = analysisText ? JSON.parse(analysisText) : null;

    if (analysis) {
      // 5️⃣ Upsert AI analysis into tbluser_analysis
      await pool.query(
        `INSERT INTO tbluser_analysis (user_id, summary, core_values, compatibility_score, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET summary = $2, core_values = $3, compatibility_score = $4, updated_at = NOW()`,
        [user_id, analysis.summary, analysis.core_values, analysis.compatibility_score]
      );

      // 6️⃣ Update tbluser compatibility_score using the shared helper
      await updateUserCompatibility(pool, user_id, analysis.compatibility_score);
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in /api/ai/save-answer:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
