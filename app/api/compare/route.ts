import { NextRequest, NextResponse } from "next/server";
import { extractText } from "@/lib/parsers";
import { getSetting } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const baseFile  = form.get("baseline") as File | null;
    const newFile   = form.get("incoming") as File | null;

    if (!baseFile || !newFile) {
      return NextResponse.json({ error: "Both files are required." }, { status: 400 });
    }

    // Parse both documents
    const [baseText, newText] = await Promise.all([
      extractText(Buffer.from(await baseFile.arrayBuffer()), baseFile.type, baseFile.name),
      extractText(Buffer.from(await newFile.arrayBuffer()), newFile.type, newFile.name),
    ]);

    if (!baseText.trim() || !newText.trim()) {
      return NextResponse.json({ error: "Could not extract text from one or both files." }, { status: 422 });
    }

    // Truncate to avoid token limits (~12k chars each ≈ ~3k tokens)
    const truncate = (s: string, max = 12000) =>
      s.length > max ? s.slice(0, max) + "\n\n[... document truncated for analysis ...]" : s;

    const baseSnip = truncate(baseText);
    const newSnip  = truncate(newText);

    // Determine LLM provider
    const provider = getSetting("llm_provider") ?? "openai";
    const model    = getSetting("llm_model")    ?? (provider === "anthropic" ? "claude-3-5-haiku-20241022" : "gpt-4o-mini");
    const apiKey   = getSetting("llm_api_key")  ?? "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "No LLM API key configured. Go to Settings → AI Model to add one." },
        { status: 503 }
      );
    }

    const systemPrompt = `You are a senior contract lawyer and legal analyst specialising in contract redlining and risk assessment.
Your job is to compare two contracts: a BASELINE (the company's standard terms) and an INCOMING contract (received from a vendor/partner).
Identify every material difference, flag risks, and present findings in structured JSON.`;

    const userPrompt = `Compare these two contracts carefully.

=== BASELINE (Our Standard Terms) ===
${baseSnip}

=== INCOMING CONTRACT (Vendor/Partner) ===
${newSnip}

Return a JSON object with this exact structure:
{
  "summary": "2-3 sentence executive summary of overall risk level and key concerns",
  "riskLevel": "low" | "medium" | "high" | "critical",
  "stats": {
    "clausesAnalyzed": <number>,
    "differences": <number>,
    "missing": <number>,
    "added": <number>,
    "risky": <number>
  },
  "findings": [
    {
      "id": 1,
      "type": "modified" | "missing" | "added" | "risky",
      "severity": "low" | "medium" | "high" | "critical",
      "clause": "<clause name / section>",
      "baseline": "<what our standard says, or null if not in baseline>",
      "incoming": "<what the incoming contract says, or null if absent>",
      "risk": "<plain-English explanation of the risk or impact>",
      "recommendation": "<what to do: accept / negotiate / reject + reason>"
    }
  ],
  "acceptableClauses": ["<list of clause names that match or are acceptable>"]
}

Focus on: payment terms, liability caps, indemnification, IP ownership, termination rights, governing law, confidentiality, dispute resolution, force majeure, warranties.
Be specific and cite actual language from the documents. Return ONLY the JSON, no markdown.`;

    let analysis: string;

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
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Anthropic API error: ${err}`);
      }
      const data = await res.json();
      analysis = data.content?.[0]?.text ?? "";
    } else {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userPrompt },
          ],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API error: ${err}`);
      }
      const data = await res.json();
      analysis = data.choices?.[0]?.message?.content ?? "";
    }

    // Parse JSON from LLM response
    const jsonStr = analysis.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const result = JSON.parse(jsonStr);

    return NextResponse.json({
      baseFilename: baseFile.name,
      incomingFilename: newFile.name,
      ...result,
    });
  } catch (err: unknown) {
    console.error("[compare]", err);
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
