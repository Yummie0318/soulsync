// src/app/api/following/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

// ✅ Helper: calculate age from year only
function calculateAge(year?: number) {
  if (!year) return null;
  const currentYear = new Date().getFullYear();
  return currentYear - year;
}

// ✅ GET following of a user
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
        COALESCE(STRING_AGG(DISTINCT ${lookingForColumn}, ', '), '') AS looking_for,
        EXISTS (
          SELECT 1 
          FROM tbluser_follow fb
          WHERE fb.follower_id = u.id AND fb.following_id = $1
        ) AS is_following_back
      FROM tbluser_follow f
      JOIN tbluser u ON u.id = f.following_id
      LEFT JOIN tbllookingfor_user lfu ON u.id = lfu.user_id
      LEFT JOIN tbllookingfor lf ON lf.id = lfu.lookingfor_id
      LEFT JOIN tblcountry cc ON u.currentcountry_id = cc.id
      LEFT JOIN tblcountry pc ON u.country_id = pc.id
      WHERE f.follower_id = $1
      GROUP BY 
        u.id, u.username, u.photo_file_path, u.city, u.postal,
        u.year, u.quote,
        ${countryColumnCC}, ${countryColumnPC}
      ORDER BY u.id DESC
      `,
      [userId]
    );

    const following = result.rows.map((row: any) => {
      const country = row.current_country || row.permanent_country || "";
      const city = row.city || "";
      const postal = row.postal || "";
      const address = [country, city, postal].filter(Boolean).join(", ");

      return {
        id: row.id,
        username: row.username || "",
        photo_file_path: row.photo_file_path || null,
        address,
        age: calculateAge(row.year), // ✅ only uses birth year
        quote: row.quote || "",
        looking_for: row.looking_for || "",
        isFollowingBack: row.is_following_back ?? false, // if they also follow you
      };
    });

    return NextResponse.json(following);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch following", details: err.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE → Unfollow someone
export async function DELETE(req: Request) {
  try {
    const { follower_id, following_id } = await req.json();
    if (!follower_id || !following_id) {
      return NextResponse.json(
        { success: false, error: "Missing follower_id or following_id" },
        { status: 400 }
      );
    }

    const pool = getPool();
    await pool.query(
      `DELETE FROM tbluser_follow WHERE follower_id = $1 AND following_id = $2`,
      [parseInt(follower_id, 10), parseInt(following_id, 10)]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Failed to unfollow", details: err.message },
      { status: 500 }
    );
  }
}

// ✅ PATCH → Toggle follow/unfollow
export async function PATCH(req: Request) {
  try {
    const { follower_id, following_id } = await req.json();
    if (!follower_id || !following_id) {
      return NextResponse.json(
        { success: false, error: "Missing follower_id or following_id" },
        { status: 400 }
      );
    }

    const pool = getPool();
    const followerIdInt = parseInt(follower_id, 10);
    const followingIdInt = parseInt(following_id, 10);

    const existing = await pool.query(
      `SELECT 1 FROM tbluser_follow WHERE follower_id = $1 AND following_id = $2`,
      [followerIdInt, followingIdInt]
    );

    const isFollowing = (existing.rowCount ?? 0) > 0;

    if (isFollowing) {
      await pool.query(
        `DELETE FROM tbluser_follow WHERE follower_id = $1 AND following_id = $2`,
        [followerIdInt, followingIdInt]
      );
      return NextResponse.json({ success: true, following: false });
    } else {
      await pool.query(
        `INSERT INTO tbluser_follow (follower_id, following_id) VALUES ($1, $2)`,
        [followerIdInt, followingIdInt]
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
