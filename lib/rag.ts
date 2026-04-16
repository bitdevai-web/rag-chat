import { embedText } from "./embeddings";
import { searchChunks } from "./vectordb";
import { bm25Search } from "./fts";

export type RetrievedChunk = {
  content: string;
  filename: string;
  score: number; // 0-100, higher is better
  method?: "vector" | "keyword" | "hybrid";
};

/**
 * Hybrid retrieval: runs semantic vector search + BM25 keyword search
 * in parallel, then fuses rankings via Reciprocal Rank Fusion (RRF).
 * Falls back gracefully if one side returns no results.
 */
export async function retrieveChunks(
  query: string,
  category: string,
  topK: number
): Promise<RetrievedChunk[]> {
  // Fetch a wider candidate pool from each retriever for better fusion
  const fetchK = Math.max(topK * 3, 10);

  const [vectorResults, bm25Results] = await Promise.all([
    (async () => {
      const queryVec = await embedText(query);
      return searchChunks(queryVec, category, fetchK);
    })(),
    (async () => bm25Search(query, category, fetchK))(),
  ]);

  // Build per-source rank maps (rank starts at 1)
  // Key chunks by (filename + chunk text) to dedupe across the two retrievers
  const key = (c: { filename: string; content: string }) =>
    `${c.filename}::${c.content.slice(0, 80)}`;

  type Fused = {
    content: string;
    filename: string;
    rrf: number;
    vectorScore?: number;   // raw 0-100
    hasVector: boolean;
    hasKeyword: boolean;
  };

  const RRF_K = 60; // standard RRF constant
  const fused = new Map<string, Fused>();

  vectorResults.forEach((r, i) => {
    const rank = i + 1;
    const k = key(r);
    const sim = Math.max(0, Math.round((1 - r._distance / 2) * 100));
    const existing = fused.get(k);
    if (existing) {
      existing.rrf += 1 / (RRF_K + rank);
      existing.hasVector = true;
      existing.vectorScore = sim;
    } else {
      fused.set(k, {
        content: r.content,
        filename: r.filename,
        rrf: 1 / (RRF_K + rank),
        vectorScore: sim,
        hasVector: true,
        hasKeyword: false,
      });
    }
  });

  bm25Results.forEach((r, i) => {
    const rank = i + 1;
    const k = key(r);
    const existing = fused.get(k);
    if (existing) {
      existing.rrf += 1 / (RRF_K + rank);
      existing.hasKeyword = true;
    } else {
      fused.set(k, {
        content: r.content,
        filename: r.filename,
        rrf: 1 / (RRF_K + rank),
        hasVector: false,
        hasKeyword: true,
      });
    }
  });

  const sorted = Array.from(fused.values())
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, topK);

  // Display score: prefer vector similarity if available, else scale RRF
  const maxRrf = sorted.length ? sorted[0].rrf : 1;
  return sorted.map((f) => ({
    content: f.content,
    filename: f.filename,
    score: f.vectorScore !== undefined
      ? f.vectorScore
      : Math.round((f.rrf / maxRrf) * 85), // keyword-only caps around 85
    method: f.hasVector && f.hasKeyword ? "hybrid" : f.hasVector ? "vector" : "keyword",
  }));
}

export function buildPrompt(
  question: string,
  chunks: RetrievedChunk[]
): string {
  const context = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.filename}]\n${c.content}`)
    .join("\n\n---\n\n");

  return `You are a helpful assistant. Answer the user's question using ONLY the context below.
If the answer is not in the context, say "I couldn't find relevant information in the uploaded documents."
Always cite the source filename in your answer.

CONTEXT:
${context}

QUESTION: ${question}

ANSWER:`;
}
