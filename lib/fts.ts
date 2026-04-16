import { getDb } from "./db";

export type FTSRow = {
  content: string;
  filename: string;
  category: string;
  document_id: number;
  chunk_index: number;
  rank: number; // fts5 bm25 rank (lower = better match)
};

export function indexChunks(
  chunks: string[],
  meta: { filename: string; category: string; document_id: number }
): void {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO chunks_fts (content, filename, category, document_id, chunk_index) VALUES (?, ?, ?, ?, ?)"
  );
  const tx = db.transaction((items: string[]) => {
    items.forEach((c, i) => stmt.run(c, meta.filename, meta.category, meta.document_id, i));
  });
  tx(chunks);
}

export function deleteChunksByDocumentId(documentId: number): void {
  const db = getDb();
  db.prepare("DELETE FROM chunks_fts WHERE document_id = ?").run(documentId);
}

/**
 * BM25 keyword search via FTS5.
 * Escapes tokens so user queries work as a loose phrase-OR search.
 */
export function bm25Search(query: string, category: string, topK: number): FTSRow[] {
  const db = getDb();
  // Tokenize into word-chars only, drop stopwords, wrap in FTS5 prefix-match syntax for loose matching
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 1)
    .slice(0, 10);
  if (tokens.length === 0) return [];
  const ftsQuery = tokens.map((t) => `${t}*`).join(" OR ");
  try {
    const rows = db
      .prepare(
        `SELECT content, filename, category, document_id, chunk_index, bm25(chunks_fts) AS rank
         FROM chunks_fts
         WHERE category = ? AND chunks_fts MATCH ?
         ORDER BY rank LIMIT ?`
      )
      .all(category, ftsQuery, topK) as FTSRow[];
    return rows;
  } catch {
    return [];
  }
}
