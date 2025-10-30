import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json({ success: false, error: "Missing user_id" }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT id, username, background_classes 
       FROM tbluser
       WHERE id = $1`,
      [parseInt(user_id, 10)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, background_classes: result.rows[0].background_classes });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Failed to fetch user background", details: err.message }, { status: 500 });
  }
}
