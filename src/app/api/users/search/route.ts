// src/app/api/users/search/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const userId = parseInt(url.searchParams.get("userId") || "0", 10);

    if (!query) return NextResponse.json([]);

    const pool = getPool();

    const result = await pool.query(
      `
      SELECT id, username, photo_file_path
      FROM tbluser
      WHERE username ILIKE $1
        AND id != $2
        AND id NOT IN (
          SELECT following_id FROM tbluser_follow WHERE follower_id = $2
        )
      ORDER BY username ASC
      LIMIT 20
      `,
      [`%${query}%`, userId]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to search users", details: err.message },
      { status: 500 }
    );
  }
}
