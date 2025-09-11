// src/app/api/myfriends/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

// ✅ Helper: calculate age from year only
function calculateAge(year?: number) {
  if (!year) return null;
  const currentYear = new Date().getFullYear();
  return currentYear - year;
}

// ✅ GET: Mutual friends with age and localized country
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) return NextResponse.json([], { status: 200 });

  try {
    const pool = getPool();
    const url = new URL(req.url);
    const locale = url.searchParams.get("locale") || "en";

    // 🔄 Pick looking_for column
    let lookingForColumn = "lf.items";
    if (locale === "de") lookingForColumn = "lf.items_de";
    if (locale === "zh") lookingForColumn = "lf.items_zh";

    // 🔄 Pick country columns
    let countryColumnCC = "cc.country";
    let countryColumnPC = "pc.country";
    if (locale === "de") {
      countryColumnCC = "cc.country_de";
      countryColumnPC = "pc.country_de";
    }
    if (locale === "zh") {
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
        u.year, u.quote, ${countryColumnCC}, ${countryColumnPC}
      ORDER BY u.id DESC
      `,
      [userId]
    );

    const friends = result.rows.map((row: any) => {
      const country = row.current_country || row.permanent_country || "";
      const city = row.city || "";
      const postal = row.postal || "";
      const address = [country, city, postal].filter(Boolean).join(", ");

      return {
        id: row.id,
        username: row.username || "",
        photo_file_path: row.photo_file_path || null,
        address,
        age: calculateAge(row.year),
        quote: row.quote || "",
        looking_for: row.looking_for || "",
      };
    });

    return NextResponse.json(friends);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch friends", details: err.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE: Unfriend
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await req.json();
    const friendId = parseInt(params.id, 10);

    if (!userId || !friendId) {
      return NextResponse.json(
        { success: false, message: "Invalid data" },
        { status: 400 }
      );
    }

    const pool = getPool();
    await pool.query(
      `DELETE FROM tbluser_follow 
       WHERE (follower_id = $1 AND following_id = $2)
          OR (follower_id = $2 AND following_id = $1)`,
      [userId, friendId]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "Failed to unfriend", error: err.message },
      { status: 500 }
    );
  }
}

// ✅ PATCH: Toggle follow/unfollow (optional for friends)
export async function PATCH(req: Request) {
  try {
    const { userId, friendId } = await req.json();
    if (!userId || !friendId) {
      return NextResponse.json(
        { success: false, error: "Missing userId or friendId" },
        { status: 400 }
      );
    }

    const pool = getPool();

    const existing = await pool.query(
      `SELECT 1 FROM tbluser_follow WHERE follower_id = $1 AND following_id = $2`,
      [userId, friendId]
    );

    const isFollowing = (existing.rowCount ?? 0) > 0;

    if (isFollowing) {
      await pool.query(
        `DELETE FROM tbluser_follow WHERE follower_id = $1 AND following_id = $2`,
        [userId, friendId]
      );
      return NextResponse.json({ success: true, following: false });
    } else {
      await pool.query(
        `INSERT INTO tbluser_follow (follower_id, following_id) VALUES ($1, $2)`,
        [userId, friendId]
      );
      return NextResponse.json({ success: true, following: true });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Failed to toggle follow", details: err.message },
      { status: 500 }
    );
  }
}
