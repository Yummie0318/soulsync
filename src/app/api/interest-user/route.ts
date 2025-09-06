import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const pool = getPool();
    const body = await req.json();

    const user_id = Number(body.user_id);
    const interests: number[] = body.interests;

    if (!user_id || !Array.isArray(interests) || interests.length === 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // ✅ Build bulk insert for speed
    const values = interests.map((id) => `(${user_id}, ${id})`).join(",");

    await pool.query(
      `INSERT INTO tblinterest_user (user_id, interest_id) VALUES ${values} ON CONFLICT DO NOTHING`
    );

    console.log(`✅ Saved ${interests.length} interests for user_id ${user_id}`);

    return NextResponse.json(
      { message: "Interests saved", user_id, count: interests.length },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ API /interest-user error:", message);
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 }
    );
  }
}
