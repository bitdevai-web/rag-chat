import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { retrieveChunks, buildPrompt } from "@/lib/rag";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { question, category_id, conversation_id } = await req.json();
    if (!question?.trim())
      return NextResponse.json({ error: "No question" }, { status: 400 });
    if (!category_id)
      return NextResponse.json({ error: "No category_id" }, { status: 400 });

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

    const db = getDb();

    // Verify ownership of the category
    const cat = db
      .prepare("SELECT id FROM categories WHERE id = ? AND owner_id = ?")
      .get(category_id, user.id) as { id: number } | undefined;
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    // Retrieve relevant chunks using local embeddings + LanceDB (keyed by category ID string)
    const chunks = await retrieveChunks(question, String(cat.id), topK);

    if (chunks.length === 0) {
      return NextResponse.json({
        answer:
          "No documents found in this category. Please upload documents in the Documents tab first.",
        sources: [],
      });
    }

    const prompt = buildPrompt(question, chunks);

    // Resolve or create a conversation thread
    let convId: number | null = null;
    if (conversation_id) {
      const existing = db
        .prepare("SELECT id FROM conversations WHERE id = ? AND category_id = ?")
        .get(conversation_id, cat.id) as { id: number } | undefined;
      if (existing) convId = existing.id;
    }
    if (!convId) {
      // Auto-create a thread titled with the first question (truncated)
      const autoTitle = question.slice(0, 60) + (question.length > 60 ? "…" : "");
      const { lastInsertRowid } = db
        .prepare("INSERT INTO conversations (category_id, title, owner_id) VALUES (?, ?, ?)")
        .run(cat.id, autoTitle, user.id);
      convId = Number(lastInsertRowid);
    } else {
      // Bump updated_at for existing thread
      db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(convId);
    }

    db.prepare(
      "INSERT INTO messages (category_id, conversation_id, role, content) VALUES (?, ?, 'user', ?)"
    ).run(cat.id, convId, question);

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

        // Notify client of the thread id (useful when auto-created)
        if (convId) send({ conversation_id: convId });

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

            const r = db.prepare(
                "INSERT INTO messages (category_id, conversation_id, role, content, sources) VALUES (?, ?, 'assistant', ?, ?)"
              ).run(cat.id, convId, fullText, JSON.stringify(sources));
            const assistantMsgId = Number(r.lastInsertRowid);

            send({ sources });

            // Generate suggested follow-ups (non-streaming, short call)
            try {
              const suggestions = await generateFollowUps(
                provider, apiKey, model, question, fullText
              );
              if (suggestions.length) {
                send({ suggestions });
                if (assistantMsgId) {
                  db.prepare("UPDATE messages SET suggestions = ? WHERE id = ?")
                    .run(JSON.stringify(suggestions), assistantMsgId);
                }
              }
            } catch {}
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

            const r2 = db.prepare(
                "INSERT INTO messages (category_id, conversation_id, role, content, sources) VALUES (?, ?, 'assistant', ?, ?)"
              ).run(cat.id, convId, fullText, JSON.stringify(sources));
            const assistantMsgId = Number(r2.lastInsertRowid);

            send({ sources });

            try {
              const suggestions = await generateFollowUps(
                provider, apiKey, model, question, fullText
              );
              if (suggestions.length) {
                send({ suggestions });
                if (assistantMsgId) {
                  db.prepare("UPDATE messages SET suggestions = ? WHERE id = ?")
                    .run(JSON.stringify(suggestions), assistantMsgId);
                }
              }
            } catch {}
          }

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

// ── Helpers ──────────────────────────────────────────────────────────────────

async function generateFollowUps(
  provider: string,
  apiKey: string,
  model: string,
  question: string,
  answer: string
): Promise<string[]> {
  const prompt = `Based on this Q&A, suggest 3 concise follow-up questions the user might ask next.
Respond with ONLY a JSON array of 3 strings, nothing else.

Question: ${question}
Answer: ${answer.slice(0, 1500)}

JSON:`;

  let text = "";
  try {
    if (provider === "anthropic") {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey });
      const res = await client.messages.create({
        model,
        max_tokens: 250,
        messages: [{ role: "user", content: prompt }],
      });
      const block = res.content[0];
      if (block?.type === "text") text = block.text;
    } else {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({ apiKey });
      const res = await client.chat.completions.create({
        model,
        max_tokens: 250,
        messages: [{ role: "user", content: prompt }],
      });
      text = res.choices[0]?.message?.content || "";
    }
  } catch {
    return [];
  }

  // Extract JSON array from response (robust against prose wrapping)
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    if (Array.isArray(arr)) {
      return arr.filter((s): s is string => typeof s === "string").slice(0, 3);
    }
  } catch {}
  return [];
}

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category_id = searchParams.get("category_id");
    const db = getDb();

    if (!category_id) return NextResponse.json([]);

    // Verify ownership
    const cat = db
      .prepare("SELECT id FROM categories WHERE id = ? AND owner_id = ?")
      .get(parseInt(category_id), user.id) as { id: number } | undefined;
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
