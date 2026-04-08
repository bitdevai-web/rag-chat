import * as lancedb from "@lancedb/lancedb";
import path from "path";
import fs from "fs";

const LANCE_DIR = path.join(process.cwd(), "data", "lancedb");
const TABLE_NAME = "chunks";

export type ChunkRecord = {
  vector: number[];
  content: string;
  filename: string;
  category: string;
  document_id: number;
  chunk_index: number;
};

export type SearchResult = ChunkRecord & { _distance: number };

// Singleton DB connection
const g = global as unknown as { __lancedb?: ReturnType<typeof lancedb.connect> extends Promise<infer T> ? T : never };

async function getDb() {
  if (g.__lancedb) return g.__lancedb;
  if (!fs.existsSync(LANCE_DIR)) fs.mkdirSync(LANCE_DIR, { recursive: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  g.__lancedb = await (lancedb as any).connect(LANCE_DIR);
  return g.__lancedb!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTable(): Promise<any | null> {
  const db = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const names: string[] = await (db as any).tableNames();
  if (!names.includes(TABLE_NAME)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).openTable(TABLE_NAME);
}

export async function addChunks(records: ChunkRecord[]): Promise<void> {
  if (records.length === 0) return;
  const db = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const names: string[] = await (db as any).tableNames();

  if (!names.includes(TABLE_NAME)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).createTable(TABLE_NAME, records);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = await (db as any).openTable(TABLE_NAME);
    await table.add(records);
  }
}

export async function searchChunks(
  queryVector: number[],
  category: string,
  topK: number
): Promise<SearchResult[]> {
  const table = await getTable();
  if (!table) return [];

  try {
    const results = await table
      .search(queryVector)
      .where(`category = '${category.replace(/'/g, "''")}'`)
      .limit(topK)
      .toArray();
    return results as SearchResult[];
  } catch {
    return [];
  }
}

export async function deleteChunksByDocId(documentId: number): Promise<void> {
  const table = await getTable();
  if (!table) return;
  try {
    await table.delete(`document_id = ${documentId}`);
  } catch {
    // ignore if empty
  }
}
