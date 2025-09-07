// src/app/api/user/route.ts
import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const pool = getPool();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    if (!userId) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    // ✅ Get main user info + counts (cast counts to INTEGER so they aren’t strings)
    const userResult = await pool.query(
      `
      SELECT 
        u.id, u.username, u.month, u.day, u.year, u.photo_file_path, u.city, u.postal,
        u.country_id, c.country AS country_name, u.details_id, l.details AS current_location,
        u.quote, u.currentcity, u.currentpostal, u.currentcountry_id,
        cc.country AS current_country_name,
        u.gender_id, u.ethnicity_id, u.zodiac_id,

        -- ✅ counts
        0 AS posts_count,
        CAST((SELECT COUNT(*) FROM tbluser_follow f WHERE f.following_id = u.id) AS INTEGER) AS followers_count,
        CAST((SELECT COUNT(*) FROM tbluser_follow f WHERE f.follower_id = u.id) AS INTEGER) AS following_count

      FROM tbluser u
      LEFT JOIN tblcountry c ON u.country_id = c.id
      LEFT JOIN tblcountry cc ON u.currentcountry_id = cc.id
      LEFT JOIN tbllocationdetails l ON u.details_id = l.id
      WHERE u.id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult.rows[0];

    // ✅ Get user's lookingfor ids
    const lookingForResult = await pool.query(
      `SELECT lookingfor_id FROM tbllookingfor_user WHERE user_id = $1`,
      [userId]
    );
    const lookingforIds = lookingForResult.rows.map((row) => row.lookingfor_id);

    // ✅ Return enriched user object
    return NextResponse.json({ ...user, lookingfor: lookingforIds });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
