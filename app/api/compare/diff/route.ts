import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Attempt to repair a truncated JSON string so it can be parsed.
 * Closes any open arrays/objects and unterminated strings.
 */
function repairJson(raw: string): string {
  let s = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

  // Remove trailing comma before attempting close
  s = s.replace(/,\s*$/, "");

  // Track open brackets
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  // Close unterminated string
  if (inString) s += '"';

  // Remove trailing comma again after possible string close
  s = s.replace(/,\s*([}\]])/, "$1");

  // Close open brackets in reverse
  while (stack.length) s += stack.pop();

  return s;
}

export async function POST(req: NextRequest) {
  try {
    const { doc1Text, doc1Name, doc2Text, doc2Name } = await req.json();
    if (!doc1Text || !doc2Text)
      return NextResponse.json({ error: "Both document texts required" }, { status: 400 });

    const provider = getSetting("llm_provider") ?? "openai";
    const model    = getSetting("llm_model")    ?? (provider === "anthropic" ? "claude-3-5-haiku-20241022" : "gpt-4o-mini");
    const apiKey   = getSetting("llm_api_key")  ?? "";
    if (!apiKey)
      return NextResponse.json({ error: "No LLM API key. Go to Settings → AI Model." }, { status: 503 });

    // Aggressive truncation — leave plenty of room for the JSON output
    const trunc = (s: string) =>
      s.length > 5000 ? s.slice(0, 5000) + "\n\n[... document truncated for analysis ...]" : s;

    const prompt = `You are a senior contract analyst. Compare the two documents below.

=== DOCUMENT 1: ${doc1Name} ===
${trunc(doc1Text)}

=== DOCUMENT 2: ${doc2Name} ===
${trunc(doc2Text)}

Return ONLY valid compact JSON (no markdown, no explanation) with this exact shape:
{"riskLevel":"low|medium|high|critical","summary":"one sentence","differences":[{"clause":"name","doc1":"what doc1 says or null","doc2":"what doc2 says or null","change":"added|removed|modified|risky","severity":"low|medium|high|critical","impact":"one sentence","recommendation":"Accept|Negotiate|Reject"}],"matching":["clause name"]}

Rules:
- Keep each string value SHORT (max 25 words). Do NOT write long sentences inside JSON strings.
- Cover: payment terms, liability cap, IP ownership, termination, confidentiality, governing law, warranties, indemnification, data protection, force majeure, assignment.
- List only REAL differences. If something matches, put it in "matching".
- Return at most 12 differences.
- Do not truncate the JSON — make sure it is complete and valid.`;

    let raw = "";

    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      raw = data.content?.[0]?.text ?? "";
    } else {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      raw = (await res.json()).choices?.[0]?.message?.content ?? "";
    }

    // Try to parse; if it fails, repair and try again
    let parsed: unknown;
    try {
      const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      try {
        parsed = JSON.parse(repairJson(raw));
      } catch (e2) {
        console.error("[diff] JSON parse failed even after repair. Raw:", raw.slice(0, 500));
        throw new Error(`LLM returned invalid JSON: ${String(e2)}`);
      }
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("[diff]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
