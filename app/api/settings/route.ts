import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = getAllSettings();
    // Never expose the raw API key — mask it
    const masked = { ...settings };
    if (masked.llm_api_key)
      masked.llm_api_key = "•".repeat(12) + masked.llm_api_key.slice(-4);
    return NextResponse.json(masked);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const allowed = [
      "llm_provider",
      "llm_model",
      "llm_api_key",
      "chunk_size",
      "chunk_overlap",
      "top_k",
    ];
    for (const key of allowed) {
      if (body[key] !== undefined && body[key] !== null) {
        setSetting(key, String(body[key]));
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Test connection endpoint
export async function PUT(req: NextRequest) {
  try {
    const { api_key, provider } = await req.json();
    if (!api_key) return NextResponse.json({ ok: false, error: "No key" });

    if (provider === "anthropic") {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: api_key });
      await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 5,
        messages: [{ role: "user", content: "hi" }],
      });
    } else {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({ apiKey: api_key });
      await client.models.list();
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
