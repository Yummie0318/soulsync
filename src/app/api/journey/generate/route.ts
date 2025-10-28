import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { trait_key } = await req.json();

    const prompt = `
      Generate a psychological assessment question related to "${trait_key}".
      Include a short explanation ("why_text") explaining why this question matters for understanding personality.

      Respond ONLY with valid JSON in this structure:
      {
        "question_text": "string",
        "trait_key": "string",
        "why_text": "string",
        "options": [
          {"text": "string", "score": number},
          {"text": "string", "score": number},
          {"text": "string", "score": number},
          {"text": "string", "score": number}
        ]
      }
    `;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that strictly outputs clean, valid JSON with no explanations or markdown code fences.",
        },
        { role: "user", content: prompt },
      ],
    });

    const rawText = response.choices[0]?.message?.content?.trim() || "";

    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim();

    const match = cleaned.match(/\{[\s\S]*\}/);
    const jsonString = match ? match[0] : cleaned;

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.error("⚠️ Failed to parse JSON from AI:", cleaned);
      return NextResponse.json(
        { success: false, error: "Invalid AI output format" },
        { status: 500 }
      );
    }

    if (
      !parsed.question_text ||
      !parsed.options ||
      !Array.isArray(parsed.options)
    ) {
      return NextResponse.json(
        { success: false, error: "Incomplete question format" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      questions: [parsed],
    });
  } catch (error) {
    console.error("❌ [AI Journey] Generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate question" },
      { status: 500 }
    );
  }
}
