import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    // 🛡️ Handle empty or invalid JSON body safely
    let trait_key = null;
    try {
      const bodyText = await req.text();
      if (!bodyText) {
        console.error("⚠️ Empty request body received in /api/journey/generate");
        return NextResponse.json(
          { success: false, error: "Empty request body" },
          { status: 400 }
        );
      }
      const body = JSON.parse(bodyText);
      trait_key = body.trait_key;
    } catch (err) {
      console.error("⚠️ Invalid JSON input in /api/journey/generate:", err);
      return NextResponse.json(
        { success: false, error: "Invalid JSON input" },
        { status: 400 }
      );
    }

    if (!trait_key) {
      return NextResponse.json(
        { success: false, error: "Missing 'trait_key' in request" },
        { status: 400 }
      );
    }

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
      console.error("⚠️ Failed to parse JSON from AI output:", cleaned);
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

    // ✅ Return same structure as before
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
