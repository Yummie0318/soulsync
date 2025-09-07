// src/app/api/user/[id]/route.ts
import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const pool = getPool();
  const userId = params.id;

  try {
    const body = await req.json();
    const {
      username,
      year,
      month,
      day,
      quote,
      gender_id,
      ethnicity_id,
      zodiac_id,
      country_id,
      city,
      postal,
      currentcountry_id,
      currentcity,
      currentpostal,
      details_id,
      lookingfor,
    } = body;

    // ✅ Update tbluser
    await pool.query(
      `
      UPDATE tbluser
      SET username=$1,
          year=$2,
          month=$3,
          day=$4,
          quote=$5,
          gender_id=$6,
          ethnicity_id=$7,
          zodiac_id=$8,
          country_id=$9,
          city=$10,
          postal=$11,
          currentcountry_id=$12,
          currentcity=$13,
          currentpostal=$14,
          details_id=$15
      WHERE id=$16
      `,
      [
        username,
        year || null,
        month || null,
        day || null,
        quote || null,
        gender_id || null,
        ethnicity_id || null,
        zodiac_id || null,
        country_id || null,
        city || null,
        postal || null,
        currentcountry_id || null,
        currentcity || null,
        currentpostal || null,
        details_id || 1,
        userId,
      ]
    );

    // ✅ Update tbllookingfor_user
    await pool.query(`DELETE FROM tbllookingfor_user WHERE user_id=$1`, [userId]);

    if (Array.isArray(lookingfor) && lookingfor.length > 0) {
      const insertValues = lookingfor
        .map((id: number, idx: number) => `($1, $${idx + 2})`)
        .join(", ");
      await pool.query(
        `INSERT INTO tbllookingfor_user (user_id, lookingfor_id) VALUES ${insertValues}`,
        [userId, ...lookingfor]
      );
    }

    // ✅ Fetch updated user (same as GET)
    const result = await pool.query(
      `
      SELECT u.id, u.username, u.month, u.day, u.year, u.photo_file_path, u.city, u.postal,
             u.country_id, c.country AS country_name, u.details_id, l.details AS current_location,
             u.quote, u.gender_id, u.ethnicity_id, u.zodiac_id, u.currentcountry_id, u.currentcity, u.currentpostal
      FROM tbluser u
      LEFT JOIN tblcountry c ON u.country_id = c.id
      LEFT JOIN tbllocationdetails l ON u.details_id = l.id
      WHERE u.id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found after update" }, { status: 404 });
    }

    const lookingforResult = await pool.query(
      `SELECT lookingfor_id FROM tbllookingfor_user WHERE user_id=$1`,
      [userId]
    );
    const lookingforIds = lookingforResult.rows.map((r) => r.lookingfor_id);

    // ✅ Return updated user object
    return NextResponse.json({ ...result.rows[0], lookingfor: lookingforIds });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
