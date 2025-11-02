import { NextResponse } from "next/server";
import getPool from "@/lib/db";

interface Traits {
  [key: string]: number;
}

interface Compatibility {
  target_user_id: number;
  score: number;
}

// 🧩 Save Answer + Recalculate Traits & Compatibility
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📩 [API] Received payload:", body);

    const { user_id, question_text, trait_key, options, selected_option } = body;

    if (!user_id || !question_text || !trait_key || !selected_option) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // 1️⃣ Find or insert question
    const questionResult = await pool.query(
      `
      WITH inserted AS (
        INSERT INTO tblquestion (question_text, trait_key, options)
        VALUES ($1, $2, $3)
        ON CONFLICT (question_text) DO UPDATE
          SET trait_key = EXCLUDED.trait_key
        RETURNING id
      )
      SELECT id FROM inserted
      UNION
      SELECT id FROM tblquestion WHERE question_text = $1
      LIMIT 1;
      `,
      [question_text, trait_key, JSON.stringify(options)]
    );

    const question_id = questionResult.rows[0]?.id;
    if (!question_id) throw new Error("❌ Failed to resolve question ID.");

    // 2️⃣ Insert the answer
    const answerResult = await pool.query(
      `INSERT INTO tbluser_answers (user_id, question_id, selected_option)
       VALUES ($1, $2, $3)
       RETURNING id;`,
      [user_id, question_id, JSON.stringify(selected_option)]
    );

    const answer_id = answerResult.rows[0]?.id;
    console.log("✅ Saved answer ID:", answer_id);

    // 3️⃣ Recalculate traits
    const answersRes = await pool.query(
      `
      SELECT q.trait_key, a.selected_option
      FROM tbluser_answers a
      JOIN tblquestion q ON a.question_id = q.id
      WHERE a.user_id = $1
      `,
      [user_id]
    );

    const traitScores: Record<string, number[]> = {};
    for (const row of answersRes.rows) {
      const trait = row.trait_key;
      let optionScore = 0;

      try {
        const selectedOptionObj = typeof row.selected_option === "string"
          ? JSON.parse(row.selected_option)
          : row.selected_option;

        optionScore = selectedOptionObj?.score || 0;
      } catch {
        optionScore = 0;
      }

      if (!traitScores[trait]) traitScores[trait] = [];
      traitScores[trait].push(optionScore);
    }

    const averaged: Traits = {};
    for (const [trait, values] of Object.entries(traitScores)) {
      averaged[trait] = values.reduce((a, b) => a + b, 0) / values.length;
    }

    // 4️⃣ Upsert traits
    await pool.query(
      `
      INSERT INTO tbluser_traits (user_id, traits, compatibility_updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET traits = EXCLUDED.traits,
            compatibility_updated_at = NOW()
      `,
      [user_id, JSON.stringify(averaged)]
    );

    console.log("✅ Updated user traits:", averaged);

    // 5️⃣ Compute compatibility only if >=10 answers
    let compatibilities: Compatibility[] = [];
    if (answersRes.rows.length >= 10) {
      const othersRes = await pool.query(
        `SELECT user_id, traits FROM tbluser_traits WHERE user_id != $1 AND traits IS NOT NULL`,
        [user_id]
      );

      const MAX_TRAIT_SCORE = 4;

      const upsertPromises = othersRes.rows.map(async (other) => {
        let otherTraits: Traits = {};
        try {
          otherTraits = JSON.parse(other.traits);
        } catch {}

        let sum = 0;
        let count = 0;
        for (const key in averaged) {
          if (key in otherTraits) {
            const diff = Math.abs(averaged[key] - otherTraits[key]) / (MAX_TRAIT_SCORE - 1);
            sum += 1 - diff;
            count++;
          }
        }

        const avgScore = count > 0 ? parseFloat((sum / count).toFixed(3)) : 0;
        compatibilities.push({ target_user_id: other.user_id, score: avgScore });

        return pool.query(
          `
          INSERT INTO tblcompatibility (user_id, target_user_id, score)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, target_user_id)
          DO UPDATE SET score = EXCLUDED.score, calculated_at = NOW()
          `,
          [user_id, other.user_id, avgScore]
        );
      });

      await Promise.all(upsertPromises);
      compatibilities = compatibilities.sort((a, b) => b.score - a.score).slice(0, 10);
      console.log(`💞 Computed compatibility for user_id ${user_id}`);
    }

    return NextResponse.json({
      success: true,
      answer_id,
      question_id,
      traits: averaged,
      compatibilities,
      answered_count: answersRes.rows.length,
    });

  } catch (error: any) {
    console.error("❌ [API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 }
    );
  }
}

// GET and DELETE remain unchanged


// 📊 Get all user answers (for progress tracking)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "Missing user_id" },
        { status: 400 }
      );
    }

    const pool = await getPool();

    const result = await pool.query(
      `SELECT COUNT(*) AS answered_count FROM tbluser_answers WHERE user_id = $1`,
      [user_id]
    );

    const count = Number(result.rows[0]?.answered_count || 0);

    console.log(`📊 [API] User ${user_id} has answered ${count} questions`);

    return NextResponse.json({
      success: true,
      answered_count: count,
    });
  } catch (error: any) {
    console.error("❌ [API] Error fetching user answers:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 }
    );
  }
}

// 🔄 Restart assessment — delete all user answers
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "Missing user_id" },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Delete all user's answers
    const deleteRes = await pool.query(
      `DELETE FROM tbluser_answers WHERE user_id = $1 RETURNING id`,
      [user_id]
    );

    console.log(
      `🗑️ [API] Deleted ${deleteRes.rowCount} answers for user ${user_id}`
    );

    return NextResponse.json({
      success: true,
      deleted_count: deleteRes.rowCount,
    });
  } catch (error: any) {
    console.error("❌ [API] Error deleting user answers:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
