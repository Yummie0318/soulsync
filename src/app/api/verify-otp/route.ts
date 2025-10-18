import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { hash } from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const pool = getPool();
    const body = await req.json();

    const email = body.email?.trim().toLowerCase();
    const otp = body.otp?.trim();
    const username = body.username?.trim();
    const password = body.password;

    if (!email || !otp || !username || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 🔍 Check OTP record
    const { rows } = await pool.query(
      `SELECT * FROM tbluser_otp WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "OTP_NOT_FOUND" }, { status: 400 });
    }

    const otpRecord = rows[0];
    const now = new Date();

    if (otpRecord.otp !== otp) {
      return NextResponse.json({ error: "OTP_INVALID" }, { status: 400 });
    }

    if (new Date(otpRecord.expires_at) < now) {
      return NextResponse.json({ error: "OTP_EXPIRED" }, { status: 400 });
    }

    // ✅ OTP is valid → create user
    const hashedPassword = await hash(password, 10);

    const { rows: newUser } = await pool.query(
      `INSERT INTO tbluser (username, email, password) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email`,
      [username, email, hashedPassword]
    );

    // 🗑️ Delete OTP after success
    await pool.query(`DELETE FROM tbluser_otp WHERE email = $1`, [email]);

    console.log("🎉 User verified & created:", newUser[0]);

    return NextResponse.json(
      { message: "User created successfully", user: newUser[0] },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ API /verify-otp error:", message);
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 }
    );
  }
}
