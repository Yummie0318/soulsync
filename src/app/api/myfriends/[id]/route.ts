// src/app/api/myfriends/[id]/route.ts
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

// ✅ GET: Mutual friends
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) {
    console.warn("[GET /myfriends/:id] Invalid userId", params.id);
    return NextResponse.json([], { status: 200 });
  }

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
        u.year, u.month, u.day, u.quote, cc.country, pc.country
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
        age: calculateAge(row.year, row.month, row.day),
        quote: row.quote || "",
        looking_for: row.looking_for || "",
      };
    });

    return NextResponse.json(friends);
  } catch (err: any) {
    console.error("[GET /myfriends/:id] Error:", err.message);
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

    console.log(`[DELETE /myfriends/${friendId}] ${userId} unfriended ${friendId}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /myfriends/:id] Error:", err.message);
    return NextResponse.json(
      { success: false, message: "Failed to unfriend", error: err.message },
      { status: 500 }
    );
  }
}
