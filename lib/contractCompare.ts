/**
 * contractCompare.ts
 * Runs LLM-based T&C comparison between a baseline and an incoming document.
 * Called automatically after upload when a baseline exists in the same category.
 */
import { getDb } from "./db";
import { getSetting } from "./settings";

export type CompareResult = {
  summary: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  stats: {
    clausesAnalyzed: number;
    differences: number;
    missing: number;
    added: number;
    risky: number;
  };
  findings: Array<{
    id: number;
    type: "modified" | "missing" | "added" | "risky";
    severity: "low" | "medium" | "high" | "critical";
    clause: string;
    baseline: string | null;
    incoming: string | null;
    risk: string;
    recommendation: string;
  }>;
  acceptableClauses: string[];
};

function truncate(s: string, max = 12000) {
  return s.length > max ? s.slice(0, max) + "\n\n[... document truncated ...]" : s;
}

export async function runContractComparison(
  baselineText: string,
  baselineFilename: string,
  incomingText: string,
  incomingFilename: string
): Promise<CompareResult> {
  const provider = getSetting("llm_provider") ?? "openai";
  const model    = getSetting("llm_model")    ?? (provider === "anthropic" ? "claude-3-5-haiku-20241022" : "gpt-4o-mini");
  const apiKey   = getSetting("llm_api_key")  ?? "";

  if (!apiKey) throw new Error("No LLM API key configured. Go to Settings → AI Model to add one.");

  const systemPrompt = `You are a senior contract lawyer specialising in contract redlining and risk assessment.
Compare two contracts: a BASELINE (the company's standard terms) and an INCOMING contract (received from a vendor/partner).
Identify every material difference, flag risks, and return structured JSON only.`;

  const userPrompt = `Compare these two contracts clause by clause.

=== BASELINE: ${baselineFilename} ===
${truncate(baselineText)}

=== INCOMING: ${incomingFilename} ===
${truncate(incomingText)}

Return ONLY a JSON object (no markdown) with this structure:
{
  "summary": "2-3 sentence executive summary of overall risk and key concerns",
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
      "clause": "<clause name>",
      "baseline": "<what baseline says, or null>",
      "incoming": "<what incoming says, or null>",
      "risk": "<plain-English risk explanation>",
      "recommendation": "<Accept / Negotiate / Reject + reason>"
    }
  ],
  "acceptableClauses": ["<clause names that match or are acceptable>"]
}`;

  let raw: string;

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
    if (!res.ok) throw new Error(`Anthropic error: ${await res.text()}`);
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
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
    const data = await res.json();
    raw = data.choices?.[0]?.message?.content ?? "";
  }

  const json = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(json) as CompareResult;
}

/**
 * Persist a comparison result to SQLite.
 */
export function saveComparison(
  documentId: number,
  baselineDocId: number,
  result: CompareResult
) {
  const db = getDb();
  db.prepare(`
    INSERT INTO contract_comparisons (document_id, baseline_doc_id, risk_level, result_json, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(document_id) DO UPDATE SET
      baseline_doc_id = excluded.baseline_doc_id,
      risk_level      = excluded.risk_level,
      result_json     = excluded.result_json,
      updated_at      = excluded.updated_at
  `).run(documentId, baselineDocId, result.riskLevel, JSON.stringify(result));
}

/**
 * Load a stored comparison result.
 */
export function getComparison(documentId: number) {
  const db = getDb();
  const row = db.prepare(`
    SELECT cc.*, d.filename AS baseline_filename
    FROM contract_comparisons cc
    JOIN documents d ON d.id = cc.baseline_doc_id
    WHERE cc.document_id = ?
  `).get(documentId) as {
    id: number; document_id: number; baseline_doc_id: number;
    baseline_filename: string; risk_level: string;
    result_json: string; created_at: string; updated_at: string;
  } | undefined;
  if (!row) return null;
  return { ...row, result: JSON.parse(row.result_json) as CompareResult };
}
