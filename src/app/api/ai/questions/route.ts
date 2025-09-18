import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  try {
    // 🔒 Check if API key is set
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OpenAI API key. Please set OPENAI_API_KEY in .env" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 🔮 Ask OpenAI to generate questions
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // cheaper & fast model
      messages: [
        {
          role: "system",
          content: "You are an AI that generates personality assessment questions with multiple choice answers.",
        },
        {
          role: "user",
          content: "Generate 1 personality questions, each with 4 answer choices. Return JSON only in this format: { questions: [ { id, text, choices[] } ] }",
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message?.content || "{}";
    const data = JSON.parse(raw);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("AI Question Error:", err);
    return NextResponse.json(
      { error: "Failed to generate questions", details: err.message },
      { status: 500 }
    );
  }
}
