export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

// ✅ Helper: calculate age from year only
function calculateAge(year?: number) {
  if (!year) return null;
  const currentYear = new Date().getFullYear();
  return currentYear - year;
}

// ✅ GET single user profile
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const url = new URL(req.url);
    const locale = url.searchParams.get("locale") || "en";

    // 🔄 Pick localized columns
    let currentCountryColumn = "cc.country";
    let permanentCountryColumn = "pc.country";
    let lookingForColumn = "lf.items";
    if (locale === "de") {
      currentCountryColumn = "cc.country_de";
      permanentCountryColumn = "pc.country_de";
      lookingForColumn = "lf.items_de";
    }
    if (locale === "zh") {
      currentCountryColumn = "cc.country_zh";
      permanentCountryColumn = "pc.country_zh";
      lookingForColumn = "lf.items_zh";
    }

    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.username,
        u.photo_file_path,
        u.quote,
        u.year,
        u.month,
        u.day,
        u.city,
        COALESCE(${currentCountryColumn}, '') AS current_country,
        COALESCE(${permanentCountryColumn}, '') AS permanent_country,
        COALESCE(STRING_AGG(DISTINCT ${lookingForColumn}, ', '), '') AS looking_for,
        -- counts
        (SELECT COUNT(*) FROM tblpost p WHERE p.user_id = u.id) AS posts_count,
        (SELECT COUNT(*) FROM tbluser_follow f WHERE f.follower_id = u.id) AS following_count,
        (SELECT COUNT(*) FROM tbluser_follow f WHERE f.following_id = u.id) AS followers_count
      FROM tbluser u
      LEFT JOIN tbllookingfor_user lfu ON u.id = lfu.user_id
      LEFT JOIN tbllookingfor lf ON lf.id = lfu.lookingfor_id
      LEFT JOIN tblcountry cc ON u.currentcountry_id = cc.id
      LEFT JOIN tblcountry pc ON u.country_id = pc.id
      WHERE u.id = $1
      GROUP BY 
        u.id, u.username, u.photo_file_path, u.quote, 
        u.year, u.month, u.day, u.city,
        ${currentCountryColumn}, ${permanentCountryColumn}
      LIMIT 1
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const row = result.rows[0];

    return NextResponse.json({
      id: row.id,
      username: row.username || "",
      photo_file_path: row.photo_file_path || null,
      quote: row.quote || "",
      age: calculateAge(row.year),
      year: row.year,
      month: row.month,
      day: row.day,
      city: row.city || "",
      country_name: row.permanent_country || "",
      current_country_name: row.current_country || "",
      looking_for: row.looking_for || "",
      posts_count: parseInt(row.posts_count, 10) || 0,
      following_count: parseInt(row.following_count, 10) || 0,
      followers_count: parseInt(row.followers_count, 10) || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch user profile", details: err.message },
      { status: 500 }
    );
  }
}
