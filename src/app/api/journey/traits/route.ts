import { NextResponse } from "next/server";
import getPool from "@/lib/db";

interface Traits {
  [key: string]: number;
}

interface Compatibility {
  target_user_id: number;
  score: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ success: false, error: "Missing user_id" }, { status: 400 });
    }

    const pool = await getPool();

    // 1️⃣ Get all answers of this user
    const res = await pool.query(
      `
      SELECT q.trait_key, a.selected_option
      FROM tbluser_answers a
      JOIN tblquestion q ON a.question_id = q.id
      WHERE a.user_id = $1
      `,
      [user_id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: "No answers found for user" });
    }

    // 2️⃣ Compute averaged trait scores
    const traitScores: Record<string, number[]> = {};
    for (const row of res.rows) {
      const trait = row.trait_key;
      let score = 0;

      try {
        const option =
          typeof row.selected_option === "object"
            ? row.selected_option
            : JSON.parse(row.selected_option);
        score = Number(option.score) || 0;
      } catch {
        console.warn(`⚠️ Could not parse selected_option for user ${user_id}`);
      }

      if (!traitScores[trait]) traitScores[trait] = [];
      traitScores[trait].push(score);
    }

    const averaged: Traits = {};
    for (const [trait, values] of Object.entries(traitScores)) {
      averaged[trait] = values.reduce((a, b) => a + b, 0) / values.length;
    }

    // 3️⃣ Upsert user traits
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

    console.log("✅ [API] Saved user traits:", averaged);

    // 4️⃣ Get other users who have traits
    const othersRes = await pool.query(
      `SELECT user_id, traits FROM tbluser_traits WHERE user_id != $1 AND traits IS NOT NULL`,
      [user_id]
    );

    if (othersRes.rows.length === 0) {
      return NextResponse.json({
        success: true,
        traits: averaged,
        compatibilities: [],
        message: "No other users found for compatibility comparison.",
      });
    }

    const MAX_TRAIT_SCORE = 4;
    const compatibilities: Compatibility[] = [];

    // 5️⃣ Compute compatibility + upsert into tblcompatibility
    const upsertPromises = othersRes.rows.map(async (other) => {
      let otherTraits: Traits = {};
      try {
        otherTraits =
          typeof other.traits === "object" ? other.traits : JSON.parse(other.traits);
      } catch {
        console.warn(`⚠️ Could not parse traits for user ${other.user_id}`);
      }

      let totalSimilarity = 0;
      let comparedTraits = 0;

      for (const key in averaged) {
        if (key in otherTraits) {
          const diff = Math.abs(averaged[key] - otherTraits[key]);
          const normalizedDiff = diff / (MAX_TRAIT_SCORE - 1);
          const similarity = 1 - normalizedDiff;
          totalSimilarity += similarity;
          comparedTraits++;
        }
      }

      const avgScore =
        comparedTraits > 0 ? parseFloat((totalSimilarity / comparedTraits).toFixed(3)) : 0;

      compatibilities.push({ target_user_id: other.user_id, score: avgScore });

      return pool.query(
        `
        INSERT INTO tblcompatibility (user_id, target_user_id, score, calculated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, target_user_id)
        DO UPDATE SET score = EXCLUDED.score, calculated_at = NOW()
        `,
        [user_id, other.user_id, avgScore]
      );
    });

    await Promise.all(upsertPromises);
    console.log(`💞 [API] Compatibility computed for user_id ${user_id}`);

    // 6️⃣ Sort by score and get top 10
    const topMatches = compatibilities.sort((a, b) => b.score - a.score).slice(0, 10);

    // 7️⃣ Fetch user info for matches
    const ids = topMatches.map((m) => m.target_user_id);
    let enrichedMatches: any[] = [];

    if (ids.length > 0) {
      const userInfoRes = await pool.query(
        `
        SELECT id, username, quote, photo_file_path
        FROM tbluser
        WHERE id = ANY($1)
        `,
        [ids]
      );

      const userInfoMap = Object.fromEntries(userInfoRes.rows.map((u) => [u.id, u]));

      enrichedMatches = topMatches.map((m) => ({
        ...m,
        username: userInfoMap[m.target_user_id]?.username || "Unknown",
        quote: userInfoMap[m.target_user_id]?.quote || "",
        photo_file_path: userInfoMap[m.target_user_id]?.photo_file_path || null,
      }));
    }

    // 8️⃣ Fetch current user info too
    const currentUserRes = await pool.query(
      `SELECT id, username, quote, photo_file_path FROM tbluser WHERE id = $1`,
      [user_id]
    );
    const currentUser = currentUserRes.rows[0] || {
      id: user_id,
      username: "You",
      quote: "",
      photo_file_path: null,
    };

    // ✅ Final response
    return NextResponse.json({
      success: true,
      traits: averaged,
      user: currentUser, // 👈 your user info added here
      compatibilities: enrichedMatches,
    });
  } catch (error: any) {
    console.error("❌ [API] Error computing compatibility:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
