import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    console.error("❌ Failed to get DB pool (islands):", err);
    return NextResponse.json(
      { error: "Database connection not initialized." },
      { status: 500 }
    );
  }

  try {
    await pool.query("SELECT 1");

    // Get locale from query params
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "en";

    // Map locale to name, description, and amount columns
    const nameMap: Record<string, string> = {
      en: "name",
      de: "name_de",
      zh: "name_zh",
    };

    const descriptionMap: Record<string, string> = {
      en: "description",
      de: "description_de",
      zh: "description_zh",
    };

    const amountMap: Record<string, string> = {
      en: "amount",
      de: "amount_de",
      zh: "amount_zh",
    };

    const nameColumn = nameMap[locale] || "name";
    const descriptionColumn = descriptionMap[locale] || "description";
    const amountColumn = amountMap[locale] || "amount";

    // Fetch islands with dynamic columns
    const result = await pool.query(
      `SELECT id, ${nameColumn} AS name, ${descriptionColumn} AS description,
              audio_path, icon, ${amountColumn} AS amount
       FROM tblisland
       ORDER BY id ASC`
    );

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in /api/islands:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
