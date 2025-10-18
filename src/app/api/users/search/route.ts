// src/app/api/users/search/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

function buildAddress(country?: string, city?: string, postal?: string) {
  return [country, city, postal].filter(Boolean).join(", ");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const userId = parseInt(url.searchParams.get("userId") || "0", 10);
    const locale = url.searchParams.get("locale") || "en";

    if (!query) return NextResponse.json([]);

    const pool = getPool();

    // ✅ Choose correct looking_for column
    let lookingForColumn = "lf.items";
    if (locale === "de") lookingForColumn = "lf.items_de";
    if (locale === "zh") lookingForColumn = "lf.items_zh";

    // ✅ Pick the correct country column based on locale
    let currentCountryColumn = "cc.country";
    let permanentCountryColumn = "pc.country";
    if (locale === "de") {
      currentCountryColumn = "cc.country_de";
      permanentCountryColumn = "pc.country_de";
    }
    if (locale === "zh") {
      currentCountryColumn = "cc.country_zh";
      permanentCountryColumn = "pc.country_zh";
    }

    // ✅ Use tbluser_follow to check following status
    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.username,
        u.photo_file_path,
        u.city,
        u.postal,
        COALESCE(${currentCountryColumn}, '') AS current_country,
        COALESCE(${permanentCountryColumn}, '') AS permanent_country,
        COALESCE(STRING_AGG(DISTINCT ${lookingForColumn}, ', '), '') AS looking_for,
        CASE WHEN uf.following_id IS NOT NULL THEN true ELSE false END AS is_following
      FROM tbluser u
      LEFT JOIN tbllookingfor_user lfu ON u.id = lfu.user_id
      LEFT JOIN tbllookingfor lf ON lf.id = lfu.lookingfor_id
      LEFT JOIN tblcountry cc ON u.currentcountry_id = cc.id
      LEFT JOIN tblcountry pc ON u.country_id = pc.id
      LEFT JOIN tbluser_follow uf
        ON uf.following_id = u.id AND uf.follower_id = $2
      WHERE u.id != $2
        AND u.username ILIKE $1
      GROUP BY 
        u.id, u.username, u.photo_file_path, u.city, u.postal,
        ${currentCountryColumn}, ${permanentCountryColumn}, uf.following_id
      ORDER BY u.username ASC
      LIMIT 20
      `,
      [`%${query}%`, userId]
    );

    const users = result.rows.map((row: any) => {
      const country = row.current_country || row.permanent_country || "";
      const address = buildAddress(country, row.city, row.postal);

      return {
        id: row.id,
        username: row.username,
        photo_file_path: row.photo_file_path,
        address,
        looking_for: row.looking_for,
        is_following: row.is_following, // 👈 true if already following
      };
    });

    return NextResponse.json(users);
  } catch (err: any) {
    console.error("Search error:", err);
    return NextResponse.json(
      { error: "Failed to search users", details: err.message },
      { status: 500 }
    );
  }
}
