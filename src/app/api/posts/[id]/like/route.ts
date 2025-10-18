// src/app/api/posts/[id]/like/route.ts
import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/posts/[id]/like
 * Body: { user_id }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error("❌ Failed to get DB pool (like):", err);
    return NextResponse.json(
      { success: false, error: "Database connection not initialized." },
      { status: 500 }
    );
  }

  try {
    const { id } = params;
    const body = await req.json();
    const user_id = Number(body.user_id);

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "user_id is required" },
        { status: 400 }
      );
    }

    await pool.query(
      `
      INSERT INTO tbllike (post_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (post_id, user_id) DO NOTHING
      `,
      [id, user_id]
    );

    return NextResponse.json({ success: true, action: "liked" }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ API /posts/[id]/like POST error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/posts/[id]/like
 * Body: { user_id }
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error("❌ Failed to get DB pool (unlike):", err);
    return NextResponse.json(
      { success: false, error: "Database connection not initialized." },
      { status: 500 }
    );
  }

  try {
    const { id } = params;
    const body = await req.json();
    const user_id = Number(body.user_id);

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "user_id is required" },
        { status: 400 }
      );
    }

    await pool.query(
      `
      DELETE FROM tbllike
      WHERE post_id = $1 AND user_id = $2
      `,
      [id, user_id]
    );

    return NextResponse.json({ success: true, action: "unliked" }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ API /posts/[id]/like DELETE error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
