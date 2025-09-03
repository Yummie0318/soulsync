// src/app/api/register/route.ts
export const runtime = "nodejs";

import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: Request) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database pool not initialized." },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as {
      username?: string;
      email?: string;
      password?: string;
    };

    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

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

    const { rows: result } = await pool.query(
      "INSERT INTO tbluser (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email",
      [username, email, hashedPassword]
    );

    return NextResponse.json({ message: "User created", user: result[0] }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("API /register error:", message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
