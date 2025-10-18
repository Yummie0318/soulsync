// src/app/api/ai/save-answer/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Utility to parse unknown errors
function parseError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

// Retry wrapper for rate-limited requests
async function retryOn429<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      if (err.status === 429 && attempt < maxRetries) {
        attempt++;
        console.warn(`⚠️ 429 rate limit hit, retrying in ${delayMs * attempt}ms...`);
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      } else {
        throw err;
      }
    }
  }
}

export async function POST(req: Request) {
  let pool;
  try {
    pool = getPool();
  } catch (err: unknown) {
    const message = parseError(err);
    console.error("❌ DB connection error (save-answer):", message);
    return NextResponse.json({ error: "Database not ready: " + message }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { user_id, question_text, answer_text } = body;

    if (!user_id || !question_text || !answer_text) {
      console.warn("⚠️ Missing required fields:", body);
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // -----------------------------
    // 1️⃣ Generate embedding for answer with retries
    // -----------------------------
    let answerEmbedding: number[] = [];
    try {
      console.log("ℹ️ Generating embedding for answer_text:", answer_text);
      const embeddingResp = await retryOn429(() =>
        openai.embeddings.create({
          model: "text-embedding-3-small",
          input: answer_text,
        })
      );
      answerEmbedding = embeddingResp.data[0].embedding;
      console.log("✅ Embedding generated (first 8 values):", answerEmbedding.slice(0, 8), "...");

      if (answerEmbedding.every((v) => v === 0)) {
        throw new Error("Embedding generation failed — all zeros");
      }
    } catch (err: unknown) {
      const message = parseError(err);
      console.error("❌ Failed to generate embedding:", message);
      return NextResponse.json({ error: "Failed to generate embedding: " + message }, { status: 500 });
    }

    // -----------------------------
    // 2️⃣ Save answer into DB
    // -----------------------------
    try {
      await pool.query(
        `INSERT INTO tbluser_answers (user_id, question_text, answer_text, answer_embedding, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [user_id, question_text, answer_text, answerEmbedding]
      );
      console.log("✅ Answer saved to DB");
    } catch (err: unknown) {
      const message = parseError(err);
      console.error("❌ Failed to save answer to DB:", message);
      return NextResponse.json({ error: "Failed to save answer to DB: " + message }, { status: 500 });
    }

    // -----------------------------
    // 3️⃣ Fetch all answers
    // -----------------------------
    let answers;
    try {
      const answersRes = await pool.query(
        `SELECT question_text, answer_text
         FROM tbluser_answers
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [user_id]
      );
      answers = answersRes.rows;
      console.log(`ℹ️ Fetched ${answers.length} answers for user_id ${user_id}`);
    } catch (err: unknown) {
      const message = parseError(err);
      console.error("❌ Failed to fetch answers:", message);
      return NextResponse.json({ error: "Failed to fetch answers: " + message }, { status: 500 });
    }

    // -----------------------------
    // 4️⃣ Generate AI analysis
    // -----------------------------
    let analysis = { summary: "Analysis unavailable", core_values: [] as string[], compatibility_score: 0 };
    try {
      const analysisPrompt = `
User's answers so far:
${answers.map((a) => `Q: ${a.question_text}\nA: ${a.answer_text}`).join("\n\n")}

Task:
- Summarize user's personality in a few sentences.
- Extract 3–5 core values as a JSON array.
- Estimate compatibility readiness score (integer 0–100) based on their answers.
- Return JSON ONLY in this format:
{
  "summary": "...",
  "core_values": ["...", "..."],
  "compatibility_score": 0
}
`;
      console.log("ℹ️ Sending analysis request to GPT...");
      const completion = await retryOn429(() =>
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a dating AI that analyzes personality." },
            { role: "user", content: analysisPrompt },
          ],
        })
      );

      const analysisText = completion.choices[0].message?.content;
      console.log("ℹ️ Raw AI analysis text:", analysisText);

      if (analysisText) {
        try {
          const parsed = JSON.parse(analysisText);
          analysis.summary = parsed.summary || "Analysis unavailable";
          analysis.core_values = parsed.core_values || [];
          analysis.compatibility_score = Number(parsed.compatibility_score) || 0;
          console.log("✅ Parsed AI analysis:", analysis);
        } catch (err: unknown) {
          const message = parseError(err);
          console.warn("⚠️ Failed to parse AI JSON:", message);
        }
      }
    } catch (err: unknown) {
      const message = parseError(err);
      console.error("❌ AI analysis error:", message);
    }

    // -----------------------------
    // 5️⃣ Save/update analysis in DB
    // -----------------------------
    try {
      await pool.query(
        `INSERT INTO tbluser_analysis (user_id, summary, core_values, compatibility_score, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET summary = $2, core_values = $3, compatibility_score = $4, updated_at = NOW()`,
        [user_id, analysis.summary, analysis.core_values, analysis.compatibility_score]
      );
      console.log("✅ Analysis saved to DB");
    } catch (err: unknown) {
      const message = parseError(err);
      console.error("❌ Failed to save analysis to DB:", message);
      return NextResponse.json({ error: "Failed to save analysis to DB: " + message }, { status: 500 });
    }

    // -----------------------------
    // 6️⃣ Return response
    // -----------------------------
    return NextResponse.json({ success: true, analysis });
  } catch (err: unknown) {
    const message = parseError(err);
    console.error("❌ Error in /api/ai/save-answer:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
