import { NextRequest, NextResponse } from "next/server";
import { extractText } from "@/lib/parsers";
import { getSetting } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const text   = await extractText(buffer, file.type, file.name);

    if (!text.trim()) return NextResponse.json({ error: "Could not extract text from file." }, { status: 422 });

    const provider = getSetting("llm_provider") ?? "openai";
    const model    = getSetting("llm_model")    ?? (provider === "anthropic" ? "claude-3-5-haiku-20241022" : "gpt-4o-mini");
    const apiKey   = getSetting("llm_api_key")  ?? "";

    if (!apiKey) return NextResponse.json({ error: "No LLM API key. Go to Settings → AI Model." }, { status: 503 });

    const truncated = text.length > 6000 ? text.slice(0, 6000) + "\n\n[truncated]" : text;

    const prompt = `You are a contract analyst. Read the following document and extract its key terms and conditions as clear bullet points.

For each important clause, write one bullet in this format:
• <Clause Name>: <what it says, in plain English, max 20 words>

Focus on: payment terms, liability, IP ownership, confidentiality, termination, governing law, warranties, indemnification, data protection, force majeure.
If a clause is absent or unclear, note it.
Return 8–15 bullet points. No preamble, no markdown headers — just the bullets.

DOCUMENT:
${truncated}`;

    let raw = "";

    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw new Error(await res.text());
      raw = (await res.json()).content?.[0]?.text ?? "";
    } else {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw new Error(await res.text());
      raw = (await res.json()).choices?.[0]?.message?.content ?? "";
    }

    const points = raw
      .split("\n")
      .map((l) => l.replace(/^[•\-\*]\s*/, "").trim())
      .filter((l) => l.length > 5);

    return NextResponse.json({ filename: file.name, points, text });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
