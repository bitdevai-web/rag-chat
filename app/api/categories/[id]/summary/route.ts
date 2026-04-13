import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { retrieveChunks } from "@/lib/rag";
import { getSetting } from "@/lib/settings";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

type Category = { id: number; name: string };

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const cat = db
      .prepare("SELECT id, name FROM categories WHERE id = ?")
      .get(parseInt(params.id)) as Category | undefined;

    if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const docCount = (
      db.prepare("SELECT COUNT(*) as n FROM documents WHERE category_id = ? AND status = 'ready'").get(cat.id) as { n: number }
    ).n;

    if (docCount === 0) {
      return NextResponse.json({ error: "No ready documents to summarize" }, { status: 400 });
    }

    // Retrieve representative chunks with a broad query
    const topK = Math.min(10, docCount * 3);
    const chunks = await retrieveChunks("main topics key information overview summary details", cat.name, topK);

    if (chunks.length === 0) {
      return NextResponse.json({ error: "No content found to summarize" }, { status: 400 });
    }

    const context = chunks
      .map((c, i) => `[${i + 1}] From ${c.filename}:\n${c.content}`)
      .join("\n\n");

    const prompt = `You are summarizing a knowledge base called "${cat.name}". Based on the document excerpts below, write a comprehensive summary covering:
- Main topics covered
- Key information and insights
- Document types and their content

Keep the summary informative and well-structured. Use plain text only.

Document excerpts:
${context}

Summary:`;

    const provider = getSetting("llm_provider") || "anthropic";
    const model = getSetting("llm_model") || "claude-sonnet-4-6";
    const apiKey = getSetting("llm_api_key") || "";

    let summary = "";

    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey });
      const msg = await client.messages.create({
        model,
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      });
      summary = (msg.content[0] as { type: string; text: string }).text;
    } else {
      const client = new OpenAI({ apiKey });
      const resp = await client.chat.completions.create({
        model,
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      });
      summary = resp.choices[0].message.content ?? "";
    }

    // Persist summary
    db.prepare("UPDATE categories SET summary = ? WHERE id = ?").run(summary, cat.id);

    return NextResponse.json({ summary, doc_count: docCount });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
