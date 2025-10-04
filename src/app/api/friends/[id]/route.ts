export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

// Helper: calculate age from year only
function calculateAge(year?: number) {
  if (!year) return null;
  const currentYear = new Date().getFullYear();
  return currentYear - year;
}

// ✅ Helper: determine online status (30s like conversations)
function isUserOnline(lastActive: string | null, thresholdMs = 30_000) {
  if (!lastActive) return false;
  const last = new Date(lastActive).getTime();
  return Date.now() - last <= thresholdMs;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return NextResponse.json([], { status: 200 });

    const pool = getPool();
    const url = new URL(req.url);
    const locale = url.searchParams.get("locale") || "en";
    const tzOffsetMinutes = parseInt(url.searchParams.get("tz") || "0", 10);

    // Pick localized columns
    let lookingForColumn = "lf.items";
    let countryColumnCC = "cc.country";
    let countryColumnPC = "pc.country";
    if (locale === "de") {
      lookingForColumn = "lf.items_de";
      countryColumnCC = "cc.country_de";
      countryColumnPC = "pc.country_de";
    } else if (locale === "zh") {
      lookingForColumn = "lf.items_zh";
      countryColumnCC = "cc.country_zh";
      countryColumnPC = "pc.country_zh";
    }

    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.username,
        u.photo_file_path,
        u.city,
        u.postal,
        u.year,
        u.quote,
        u.last_active,
        COALESCE(${countryColumnCC}, '') AS current_country,
        COALESCE(${countryColumnPC}, '') AS permanent_country,
        COALESCE(STRING_AGG(DISTINCT ${lookingForColumn}, ', '), '') AS looking_for
      FROM tbluser_follow f1
      JOIN tbluser_follow f2 
        ON f1.following_id = f2.follower_id 
       AND f2.following_id = f1.follower_id
      JOIN tbluser u ON u.id = f1.following_id
      LEFT JOIN tbllookingfor_user lfu ON u.id = lfu.user_id
      LEFT JOIN tbllookingfor lf ON lf.id = lfu.lookingfor_id
      LEFT JOIN tblcountry cc ON u.currentcountry_id = cc.id
      LEFT JOIN tblcountry pc ON u.country_id = pc.id
      WHERE f1.follower_id = $1
      GROUP BY 
        u.id, u.username, u.photo_file_path, u.city, u.postal,
        u.year, u.quote, u.last_active, ${countryColumnCC}, ${countryColumnPC}
      ORDER BY u.username ASC
      `,
      [userId]
    );

    const friends = result.rows.map((row: any) => {
      const country = row.current_country || row.permanent_country || "";
      const city = row.city || "";
      const postal = row.postal || "";
      const address = [country, city, postal].filter(Boolean).join(", ");

      // Convert last_active UTC to client local
      let last_active_local = row.last_active;
      if (row.last_active && !isNaN(tzOffsetMinutes)) {
        const date = new Date(row.last_active);
        date.setMinutes(date.getMinutes() - tzOffsetMinutes);
        last_active_local = date.toISOString();
      }

      return {
        id: row.id,
        username: row.username || "",
        photo: row.photo_file_path || null,
        address,
        age: calculateAge(row.year),
        quote: row.quote || "",
        looking_for: row.looking_for || "",
        last_active: row.last_active,
        last_active_local,
        // ✅ Use same 30s threshold online calculation as conversations
        isOnline: isUserOnline(last_active_local),
      };
    });

    console.log(`📡 /api/friends/${userId} returning ${friends.length} friends`);

    return NextResponse.json(friends);
  } catch (err: any) {
    console.error("❌ GET /api/friends/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch friends for messages", details: err.message },
      { status: 500 }
    );
  }
};
