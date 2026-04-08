import { embedText } from "./embeddings";
import { searchChunks } from "./vectordb";

export type RetrievedChunk = {
  content: string;
  filename: string;
  score: number; // 0-100
};

export async function retrieveChunks(
  query: string,
  category: string,
  topK: number
): Promise<RetrievedChunk[]> {
  const queryVec = await embedText(query);
  const results = await searchChunks(queryVec, category, topK);

  return results.map((r) => ({
    content: r.content,
    filename: r.filename,
    // LanceDB returns L2 distance — convert to a 0-100 similarity score
    score: Math.max(0, Math.round((1 - r._distance / 2) * 100)),
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
