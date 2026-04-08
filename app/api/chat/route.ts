import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { retrieveChunks, buildPrompt } from "@/lib/rag";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { question, category } = await req.json();
    if (!question?.trim())
      return NextResponse.json({ error: "No question" }, { status: 400 });
    if (!category)
      return NextResponse.json({ error: "No category" }, { status: 400 });

    const provider = getSetting("llm_provider") || "anthropic";
    const apiKey = getSetting("llm_api_key");
    const model =
      getSetting("llm_model") ||
      (provider === "anthropic" ? "claude-sonnet-4-6" : "gpt-4o");
    const topK = parseInt(getSetting("top_k") || "3");

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key configured. Go to Settings and add your Anthropic or OpenAI key." },
        { status: 400 }
      );
    }

    // Retrieve relevant chunks using local embeddings + LanceDB
    const chunks = await retrieveChunks(question, category, topK);

    if (chunks.length === 0) {
      return NextResponse.json({
        answer:
          "No documents found in this category. Please upload documents in the Documents tab first.",
        sources: [],
      });
    }

    const prompt = buildPrompt(question, chunks);

    const db = getDb();
    const cat = db
      .prepare("SELECT id FROM categories WHERE name = ?")
      .get(category) as { id: number } | undefined;

    if (cat) {
      db.prepare(
        "INSERT INTO messages (category_id, role, content) VALUES (?, 'user', ?)"
      ).run(cat.id, question);
    }

    const sources = chunks.map((c) => ({
      file: c.filename,
      excerpt: c.content.slice(0, 150) + (c.content.length > 150 ? "…" : ""),
      score: c.score,
    }));

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          if (provider === "anthropic") {
            const Anthropic = (await import("@anthropic-ai/sdk")).default;
            const client = new Anthropic({ apiKey });
            let fullText = "";

            const anthropicStream = await client.messages.stream({
              model,
              max_tokens: 1024,
              messages: [{ role: "user", content: prompt }],
            });

            for await (const event of anthropicStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                fullText += event.delta.text;
                send({ text: event.delta.text });
              }
            }

            if (cat) {
              db.prepare(
                "INSERT INTO messages (category_id, role, content, sources) VALUES (?, 'assistant', ?, ?)"
              ).run(cat.id, fullText, JSON.stringify(sources));
            }
          } else {
            const OpenAI = (await import("openai")).default;
            const client = new OpenAI({ apiKey });
            let fullText = "";

            const openaiStream = await client.chat.completions.create({
              model,
              stream: true,
              messages: [{ role: "user", content: prompt }],
            });

            for await (const chunk of openaiStream) {
              const text = chunk.choices[0]?.delta?.content || "";
              if (text) {
                fullText += text;
                send({ text });
              }
            }

            if (cat) {
              db.prepare(
                "INSERT INTO messages (category_id, role, content, sources) VALUES (?, 'assistant', ?, ?)"
              ).run(cat.id, fullText, JSON.stringify(sources));
            }
          }

          send({ sources });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e) {
          send({ error: String(e) });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const db = getDb();

    if (!category) return NextResponse.json([]);

    const cat = db
      .prepare("SELECT id FROM categories WHERE name = ?")
      .get(category) as { id: number } | undefined;
    if (!cat) return NextResponse.json([]);

    const messages = db
      .prepare(
        "SELECT id, role, content, sources, created_at FROM messages WHERE category_id = ? ORDER BY created_at ASC LIMIT 100"
      )
      .all(cat.id);

    return NextResponse.json(messages);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
