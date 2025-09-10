// src/app/api/followers/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

// Helper: calculate age
function calculateAge(year?: number, month?: number, day?: number) {
  if (!year || !month || !day) return null;
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

// ✅ GET followers of a user
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
    let lookingForColumn = "lf.items";
    if (locale === "de") lookingForColumn = "lf.items_de";
    if (locale === "zh") lookingForColumn = "lf.items_zh";

    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.username,
        u.photo_file_path,
        u.city,
        u.postal,
        u.year,
        u.month,
        u.day,
        u.quote,
        COALESCE(cc.country, '') AS current_country,
        COALESCE(pc.country, '') AS permanent_country,
        COALESCE(STRING_AGG(DISTINCT ${lookingForColumn}, ', '), '') AS looking_for,
        EXISTS (
          SELECT 1 
          FROM tbluser_follow fb
          WHERE fb.follower_id = $1 AND fb.following_id = u.id
        ) AS is_following_back
      FROM tbluser_follow f
      JOIN tbluser u ON u.id = f.follower_id
      LEFT JOIN tbllookingfor_user lfu ON u.id = lfu.user_id
      LEFT JOIN tbllookingfor lf ON lf.id = lfu.lookingfor_id
      LEFT JOIN tblcountry cc ON u.currentcountry_id = cc.id
      LEFT JOIN tblcountry pc ON u.country_id = pc.id
      WHERE f.following_id = $1
      GROUP BY 
        u.id, u.username, u.photo_file_path, u.city, u.postal,
        u.year, u.month, u.day, u.quote, cc.country, pc.country
      ORDER BY u.id DESC
      `,
      [userId]
    );

    const followers = result.rows.map((row: any) => {
      const country = row.current_country || row.permanent_country || "";
      const city = row.city || "";
      const postal = row.postal || "";
      const address = [country, city, postal].filter(Boolean).join(", ");

      return {
        id: row.id,
        username: row.username || "",
        photo_file_path: row.photo_file_path || null,
        address,
        age: calculateAge(row.year, row.month, row.day),
        quote: row.quote || "",
        looking_for: row.looking_for || "",
        isFollowing: row.is_following_back ?? false, // reflects follow back status
      };
    });

    return NextResponse.json(followers);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch followers", details: err.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE → Remove follower
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
      { success: false, error: "Failed to remove follower", details: err.message },
      { status: 500 }
    );
  }
}

// ✅ PATCH → Toggle follow/unfollow (Follow Back or Unfollow)
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

    // Check if already following
    const existing = await pool.query(
      `SELECT 1 FROM tbluser_follow WHERE follower_id = $1 AND following_id = $2`,
      [followerIdInt, followingIdInt]
    );

    const isFollowing = (existing.rowCount ?? 0) > 0; // <-- TypeScript-safe

    if (isFollowing) {
      // Unfollow → delete row
      await pool.query(
        `DELETE FROM tbluser_follow WHERE follower_id = $1 AND following_id = $2`,
        [followerIdInt, followingIdInt]
      );
      return NextResponse.json({ success: true, following: false });
    } else {
      // Follow → insert row
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
