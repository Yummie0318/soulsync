import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import postgres from "postgres";

// Connect to PostgreSQL
const sql = postgres(process.env.DATABASE_URL);

export async function POST(req) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Check if username or email already exists
    const existingUsers = await sql`
      SELECT username, email
      FROM tbluser
      WHERE username = ${username} OR email = ${email}
    `;

    if (existingUsers.length > 0) {
      const duplicate = existingUsers[0];
      if (duplicate.username === username) {
        return NextResponse.json({ error: "Username already exists" }, { status: 400 });
      }
      if (duplicate.email === email) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 });
      }
    }

    // Hash the password
    const hashedPassword = await hash(password, 10);

    // Insert user
    const result = await sql`
      INSERT INTO tbluser (username, email, password)
      VALUES (${username}, ${email}, ${hashedPassword})
      RETURNING id, username, email;
    `;

    return NextResponse.json({ message: "User created", user: result[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
