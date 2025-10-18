// src/app/api/login/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    console.log("📩 Incoming login request:", { email });

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    const pool = getPool();
    console.log("🔗 Connected to DB, querying user...");

    const result = await pool.query(
      `SELECT id, email, password, username, year, gender_id, postal
       FROM tbluser
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    console.log("📊 Query result:", result.rows);

    if (result.rowCount === 0) {
      console.warn("⚠️ User not found:", email);
      return NextResponse.json(
        { success: false, message: "Wrong email or password" },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // 🔑 Password check
    const validPassword = await bcrypt.compare(password, user.password);
    console.log("🔑 Password valid?", validPassword);

    if (!validPassword) {
      return NextResponse.json(
        { success: false, message: "Wrong email or password" },
        { status: 401 }
      );
    }

    // ✅ Redirect logic (fixed)
    let redirectTo = "/profile-setup";
    if (user.year || user.gender_id || (user.postal && user.postal.trim() !== "")) {
      redirectTo = "/my-room";
    }

    console.log(`➡️ Redirecting user ${user.id} to:`, redirectTo);

    return NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      redirect: redirectTo,
    });
  } catch (err: any) {
    console.error("[POST /login] ❌ Error:", err);
    return NextResponse.json(
      { success: false, message: "Login failed", error: err.message },
      { status: 500 }
    );
  }
}
