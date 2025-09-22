import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const pool = getPool();
    const formData = await req.formData();

    const user_id = Number(formData.get("user_id"));
    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    let photo_url: string | null = null;
    let photo_filename: string | null = null;

    const photoFile = formData.get("avatar") as File | null;
    if (photoFile) {
      const bytes = Buffer.from(await photoFile.arrayBuffer());
      const ext = path.extname(photoFile.name) || ".jpg";
      const filename = `user_${user_id}_${Date.now()}${ext}`;
      photo_filename = filename;

      if (process.env.VERCEL) {
        const blob = await put(`profile/${filename}`, bytes, { access: "public" });
        photo_url = blob.url;
      } else {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, bytes);
        photo_url = `/uploads/${filename}`;
      }
    } else {
      return NextResponse.json({ error: "No avatar uploaded" }, { status: 400 });
    }

    // Update tbluser
    await pool.query(
      `UPDATE tbluser
       SET photo_file_path = $1, photo_file_name = $2
       WHERE id = $3`,
      [photo_url, photo_filename, user_id]
    );

    return NextResponse.json({
      success: true,
      photo_url,
      photo_filename,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ API /update-avatar error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
