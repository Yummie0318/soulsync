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

    // Fetch user including the fields we need to check
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

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    console.log("🔑 Password valid?", validPassword);

    if (!validPassword) {
      return NextResponse.json(
        { success: false, message: "Wrong email or password" },
        { status: 401 }
      );
    }

    // Determine redirect based on year, gender_id, postal
    let redirectTo = "";
    if (!user.year && !user.gender_id && !user.postal) {
      redirectTo = "/profile-setup"; // if none of the fields exist
    } else {
      redirectTo = "/my-room"; // if any of the fields exist
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
