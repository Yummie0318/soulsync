import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // 🔍 Check for duplicates
    const { rows: existing } = await pool.query(
      "SELECT id, username, email FROM tbluser WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existing.length > 0) {
      if (existing[0].username === username) {
        return NextResponse.json({ code: "USERNAME_EXISTS" }, { status: 400 });
      }
      if (existing[0].email === email) {
        return NextResponse.json({ code: "EMAIL_EXISTS" }, { status: 400 });
      }
    }

    // 🔑 Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    // 💾 Ensure only one OTP per email
    await pool.query("DELETE FROM tbluser_otp WHERE email = $1", [email]);
    await pool.query(
      `INSERT INTO tbluser_otp (email, otp, expires_at) 
       VALUES ($1, $2, $3)`,
      [email, otp, expiresAt]
    );

    // 📧 Send OTP email
    try {
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: email,
        subject: "Your SoulSyncAI OTP Code",
        html: `
          <p>Your OTP code is: <strong>${otp}</strong></p>
          <p>This code will expire in 5 minutes.</p>
        `,
      });

      if ((result as any).error) {
        console.error("❌ Resend error:", (result as any).error);
        return NextResponse.json(
          { error: "Failed to send OTP email" },
          { status: 500 }
        );
      }

      // ✅ Log info for debugging
      console.log("📧 Email sent:", {
        id: (result as any).id,
        to: (result as any).to,
      });
    } catch (mailErr) {
      console.error("❌ Email sending failed:", mailErr);
      return NextResponse.json(
        { error: "Failed to send OTP email" },
        { status: 500 }
      );
    }

    console.log(`✅ OTP generated for ${email}: ${otp}`);

    return NextResponse.json(
      {
        message: "OTP sent to email. Please verify to complete registration.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ API /register error:", message);
    return NextResponse.json(
      { error: message || "Server error" },
      { status: 500 }
    );
  }
}
