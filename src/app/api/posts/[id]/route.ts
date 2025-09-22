import { NextRequest, NextResponse } from "next/server";
import getPool from "@/lib/db";
import fs from "fs";
import path from "path";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const postId = Number(params.id);
    if (!postId) {
      return NextResponse.json({ success: false, error: "Post ID is required" }, { status: 400 });
    }

    const formData = await req.formData();
    const pool = getPool();

    const text = (formData.get("text") as string) || null;
    const imageFile = formData.get("image") as File | null;
    const removeImage = formData.get("remove_image") === "true"; // optional flag if frontend wants to remove

    let image_url: string | null = null;
    let image_name: string | null = null;

    // Handle new image upload
    if (imageFile) {
      const bytes = Buffer.from(await imageFile.arrayBuffer());
      const ext = path.extname(imageFile.name) || ".jpg";
      const filename = `post_${postId}_${Date.now()}${ext}`;
      image_name = filename;

      if (process.env.VERCEL) {
        const blob = await put(`posts/${filename}`, bytes, { access: "public" });
        image_url = blob.url;
      } else {
        const uploadDir = path.join(process.cwd(), "public", "uploads/posts");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, bytes);
        image_url = `/uploads/posts/${filename}`;
      }
    }

    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (text !== null) {
      fields.push(`text = $${idx++}`);
      values.push(text);
    }

    if (imageFile) {
      // New image uploaded
      fields.push(`image_path = $${idx++}`);
      values.push(image_url);
      fields.push(`image_name = $${idx++}`);
      values.push(image_name);
    } else if (removeImage) {
      // Remove existing image
      fields.push(`image_path = NULL`);
      fields.push(`image_name = NULL`);
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
    }

    values.push(postId); // for WHERE clause

    const result = await pool.query(
      `UPDATE tblpost SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );

    return NextResponse.json({ success: true, post: result.rows[0] });
  } catch (err: any) {
    console.error("❌ API /posts/[id] PUT error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update post", details: err.message },
      { status: 500 }
    );
  }
}
