// src/app/api/posts/route.ts
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/posts
 * Optional query: user_id (to filter posts by author)
 * Optional query: current_user_id (to check if liked by this user)
 */
export async function GET(req: Request) {
  try {
    const pool = getPool();
    const { searchParams } = new URL(req.url);

    const filter_user_id = searchParams.get("user_id");
    const current_user_id = searchParams.get("current_user_id"); // 👈 who is viewing the posts

    let query = `
      SELECT p.id, p.user_id, p.text, p.image_path, p.image_name,
             p.likes_count, p.created_at, p.updated_at
      FROM tblpost p
    `;
    let params: any[] = [];

    if (filter_user_id) {
      query += ` WHERE p.user_id = $1`;
      params.push(filter_user_id);
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, params);
    const posts = result.rows;

    // If we have a current_user_id, check which posts they liked
    if (current_user_id && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const likeResult = await pool.query(
        `
        SELECT post_id
        FROM tbllike
        WHERE user_id = $1 AND post_id = ANY($2)
        `,
        [current_user_id, postIds]
      );
      const likedSet = new Set(likeResult.rows.map((r) => r.post_id));

      // add isLikedByCurrentUser flag
      posts.forEach((post) => {
        post.isLikedByCurrentUser = likedSet.has(post.id);
      });
    }

    return NextResponse.json(posts, { status: 200 });
  } catch (err: any) {
    console.error("❌ API /posts GET error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch posts", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const pool = getPool();

    const user_id = Number(formData.get("user_id"));
    const text = (formData.get("text") as string) || "";
    if (!user_id || !text) {
      return NextResponse.json(
        { success: false, error: "user_id and text are required" },
        { status: 400 }
      );
    }

    let image_url: string | null = null;
    let image_name: string | null = null;

    const imageFile = formData.get("image") as File | null;
    if (imageFile) {
      const bytes = Buffer.from(await imageFile.arrayBuffer());
      const ext = path.extname(imageFile.name) || ".jpg";
      const filename = `post_${user_id}_${Date.now()}${ext}`;
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

    const result = await pool.query(
      `
      INSERT INTO tblpost (user_id, text, image_path, image_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, text, image_path, image_name, likes_count, created_at, updated_at
      `,
      [user_id, text, image_url, image_name]
    );

    return NextResponse.json({ success: true, post: result.rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error("❌ API /posts POST error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create post", details: err.message },
      { status: 500 }
    );
  }
}
