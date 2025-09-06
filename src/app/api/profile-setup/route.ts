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

    // Step 2
    const year = Number(formData.get("year")) || null;
    const month = Number(formData.get("month")) || null;
    const day = Number(formData.get("day")) || null;

    // Step 3
    const gender_id = Number(formData.get("gender_id")) || null;
    const zodiac_id = Number(formData.get("zodiac_id")) || null;
    const lookingfor = formData.getAll("lookingfor[]").map((v) => Number(v));
    const interests = formData.getAll("interests[]").map((v) => Number(v));

    // Step 4
    const country_id = Number(formData.get("country_id")) || null;
    const city = (formData.get("city") as string) || null;
    const postal = (formData.get("postal") as string) || null;

    // Step 5
    const quote = (formData.get("quote") as string) || null;
    let photo_url: string | null = null;
    let photo_filename: string | null = null; // NEW

    // ✅ Handle file upload
    const photoFile = formData.get("photo") as File | null;
    if (photoFile) {
      const bytes = Buffer.from(await photoFile.arrayBuffer());
      const ext = path.extname(photoFile.name) || ".jpg";
      const filename = `user_${user_id}_${Date.now()}${ext}`;
      photo_filename = filename; // ✅ save filename separately

      if (process.env.VERCEL) {
        // On Vercel → use Blob storage
        const blob = await put(`profile/${filename}`, bytes, { access: "public" });
        photo_url = blob.url;
      } else {
        // Local Dev → save to /public/uploads
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, bytes);
        photo_url = `/uploads/${filename}`;
        console.log(`📸 Saved locally at ${filePath}`);
      }
    } else {
      console.warn("⚠️ No photo uploaded in formData");
    }

    // ✅ Update tbluser (save BOTH name + path)
    await pool.query(
      `UPDATE tbluser
       SET year = $1, month = $2, day = $3,
           gender_id = $4, zodiac_id = $5,
           country_id = $6, city = $7, postal = $8,
           photo_file_path = $9, photo_file_name = $10, quote = $11
       WHERE id = $12`,
      [
        year,
        month,
        day,
        gender_id,
        zodiac_id,
        country_id,
        city,
        postal,
        photo_url,
        photo_filename, // ✅ now saving filename
        quote,
        user_id,
      ]
    );
    console.log(`✅ Updated tbluser for user ${user_id} with photo: ${photo_url} (${photo_filename})`);

    // ✅ Lookingfor
    if (lookingfor.length > 0) {
      await pool.query(`DELETE FROM tbllookingfor_user WHERE user_id = $1`, [user_id]);
      const lfValues = lookingfor.map((id) => `(${user_id}, ${id})`).join(",");
      await pool.query(
        `INSERT INTO tbllookingfor_user (user_id, lookingfor_id) VALUES ${lfValues} ON CONFLICT DO NOTHING`
      );
    }

    // ✅ Interests
    if (interests.length > 0) {
      await pool.query(`DELETE FROM tblinterest_user WHERE user_id = $1`, [user_id]);
      const intValues = interests.map((id) => `(${user_id}, ${id})`).join(",");
      await pool.query(
        `INSERT INTO tblinterest_user (user_id, interest_id) VALUES ${intValues} ON CONFLICT DO NOTHING`
      );
    }

    return NextResponse.json(
      {
        message: "All steps saved",
        user_id,
        photo_url,
        photo_filename, // ✅ return filename for debugging
        lookingfor_count: lookingfor.length,
        interests_count: interests.length,
        quote,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ API /profile-setup error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
