// src/app/api/user/update-background/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { background_classes, user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "Missing user_id" },
        { status: 400 }
      );
    }

    if (!background_classes) {
      return NextResponse.json(
        { success: false, error: "Missing background_classes" },
        { status: 400 }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      `UPDATE tbluser
       SET background_classes = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, username, background_classes`,
      [background_classes, parseInt(user_id, 10)]
    );

    return NextResponse.json({ success: true, user: result.rows[0] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: "Failed to update user settings", details: err.message },
      { status: 500 }
    );
  }
}
