// src/app/api/users/ping/route.ts
import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export async function POST(req: Request) {
  try {
    console.log("📡 /api/users/ping called");

    const body = await req.json();
    console.log("📥 Request body:", body);

    const { userId, timezoneOffsetMinutes } = body; // optional client timezone offset
    if (!userId) {
      console.warn("⚠️ Missing userId in request");
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Store last_active in UTC
    const result = await pool.query(
      `UPDATE tbluser 
       SET last_active = NOW() AT TIME ZONE 'UTC'
       WHERE id = $1
       RETURNING id, last_active`,
      [userId]
    );

    if (result.rowCount === 0) {
      console.warn(`⚠️ No user found with id ${userId}`);
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const lastActiveUTC = result.rows[0].last_active; // stored in UTC
    console.log(`✅ Updated last_active for userId ${userId}:`, lastActiveUTC);

    // Convert to client local time if timezone offset is provided
    let lastActiveLocal = lastActiveUTC;
    if (typeof timezoneOffsetMinutes === "number") {
      const date = new Date(lastActiveUTC);
      // Adjust by the client offset (minutes behind UTC)
      date.setMinutes(date.getMinutes() - timezoneOffsetMinutes);
      lastActiveLocal = date.toISOString();
    }

    return NextResponse.json({
      success: true,
      last_active: lastActiveUTC,      // UTC
      last_active_local: lastActiveLocal // client-local
    });

  } catch (err: any) {
    console.error("❌ Error in /api/users/ping:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
