// C:\Users\Yummie03\Desktop\soulsyncai\src\app\api\ai\match-users\route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: Request) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error("❌ DB connection error (match-users):", err);
    return NextResponse.json({ error: "Database not ready" }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    // 1. Get current user
    const userResult = await pool.query(
      `SELECT id, username, embedding, country_id, island_id, year
       FROM tbluser
       WHERE id = $1`,
      [user_id]
    );
    const user = userResult.rows[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let userEmbedding = user.embedding;

    // 2. Generate embedding if missing
    if (!userEmbedding) {
      const answersResult = await pool.query(
        `SELECT question_text, answer_text
         FROM tbluser_answers
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [user_id]
      );
      const answers = answersResult.rows;
      if (answers.length === 0) {
        return NextResponse.json({ error: "No answers found to build embedding" }, { status: 404 });
      }

      const combinedAnswers = answers
        .map((a) => `Q: ${a.question_text}\nA: ${a.answer_text}`)
        .join("\n\n");

      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: combinedAnswers,
      });
      userEmbedding = embeddingResponse.data[0].embedding;

      await pool.query(
        `UPDATE tbluser SET embedding = $1 WHERE id = $2`,
        [userEmbedding, user_id]
      );
    }

    // 3. Candidate matches: island → country → global
    const matches: any[] = [];

    const islandMatches = await pool.query(
      `SELECT id, username, country_id, island_id, year,
              1 - (embedding <=> $1) AS similarity
       FROM tbluser
       WHERE id != $2
         AND island_id = $3
         AND embedding IS NOT NULL
       ORDER BY similarity DESC
       LIMIT 20`,
      [userEmbedding, user_id, user.island_id]
    );
    matches.push(...islandMatches.rows);

    if (matches.length < 10) {
      const countryMatches = await pool.query(
        `SELECT id, username, country_id, island_id, year,
                1 - (embedding <=> $1) AS similarity
         FROM tbluser
         WHERE id != $2
           AND country_id = $3
           AND embedding IS NOT NULL
         ORDER BY similarity DESC
         LIMIT 20`,
        [userEmbedding, user_id, user.country_id]
      );
      matches.push(...countryMatches.rows);
    }

    if (matches.length < 10) {
      const globalMatches = await pool.query(
        `SELECT id, username, country_id, island_id, year,
                1 - (embedding <=> $1) AS similarity
         FROM tbluser
         WHERE id != $2
           AND embedding IS NOT NULL
         ORDER BY similarity DESC
         LIMIT 20`,
        [userEmbedding, user_id]
      );
      matches.push(...globalMatches.rows);
    }

    // 4. Attach cached AI analysis if exists
    const enrichedMatches = [];
    for (const match of matches.slice(0, 10)) {
      try {
        const cached = await pool.query(
          `SELECT summary, core_values, compatibility_score
           FROM tbluser_analysis
           WHERE user_id = $1`,
          [match.id]
        );

        let analysis = cached.rows[0] || null;

        enrichedMatches.push({
          ...match,
          analysis,
        });
      } catch (err) {
        console.error(`⚠️ Error enriching match ${match.id}:`, err);
        enrichedMatches.push({ ...match, analysis: null });
      }
    }

    return NextResponse.json({
      user_id,
      total_matches: enrichedMatches.length,
      matches: enrichedMatches,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in /api/ai/match-users:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
