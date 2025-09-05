import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const pool = getPool();

    const body = await req.json();
    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Check for duplicates
    const { rows: existing } = await pool.query(
      "SELECT id, username, email FROM tbluser WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (existing.length > 0) {
      if (existing[0].username === username) {
        return NextResponse.json({ error: "Username already exists" }, { status: 400 });
      }
      if (existing[0].email === email) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 });
      }
    }

    const hashedPassword = await hash(password, 10);

    const { rows } = await pool.query(
      "INSERT INTO tbluser (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email",
      [username, email, hashedPassword]
    );

    console.log("✅ New user created:", rows[0]);
    return NextResponse.json({ message: "User created", user: rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ API /register error:", message);
    return NextResponse.json({ error: message || "Server error" }, { status: 500 });
  }
}
