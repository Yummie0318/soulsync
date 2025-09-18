import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { user_id, island_id, amount } = await req.json();

  if (!user_id || !island_id || !amount) {
    return NextResponse.json(
      { error: "Missing required fields: user_id, island_id, amount" },
      { status: 400 }
    );
  }

  if (isNaN(Number(amount))) {
    return NextResponse.json(
      { error: "Amount must be a valid number" },
      { status: 400 }
    );
  }

  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error("❌ Failed to get DB pool (island select):", err);
    return NextResponse.json(
      { error: "Database connection not initialized." },
      { status: 500 }
    );
  }

  try {
    // Start transaction
    await pool.query("BEGIN");

    // Update user with selected island
    const userUpdate = await pool.query(
      `UPDATE tbluser 
       SET island_id = $1 
       WHERE id = $2
       RETURNING id, username, email, island_id`,
      [island_id, user_id]
    );

    if (userUpdate.rowCount === 0) {
      await pool.query("ROLLBACK");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Insert payment record
    const paymentInsert = await pool.query(
      `INSERT INTO tblpayment (user_id, island_id, amount) 
       VALUES ($1, $2, $3)
       RETURNING id, user_id, island_id, amount, created_at`,
      [user_id, island_id, amount]
    );

    // Commit transaction
    await pool.query("COMMIT");

    return NextResponse.json({
      message: "✅ Island selected and payment recorded successfully.",
      user: userUpdate.rows[0],
      payment: paymentInsert.rows[0],
    });
  } catch (error: unknown) {
    await pool.query("ROLLBACK");
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in /api/islands/select:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
