import { pipeline, env } from "@xenova/transformers";
import path from "path";

// Cache model files locally inside the project — ~80 MB, downloaded once
env.cacheDir = path.join(process.cwd(), "data", "models");
env.allowLocalModels = true;
env.allowRemoteModels = true;

const MODEL = "Xenova/all-MiniLM-L6-v2";

// Singleton pipeline — survives Next.js hot-reloads in dev
const g = global as unknown as { __embedder?: Awaited<ReturnType<typeof pipeline>> };

async function getEmbedder() {
  if (!g.__embedder) {
    g.__embedder = await pipeline("feature-extraction", MODEL, { quantized: true });
  }
  return g.__embedder;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getEmbedder();
  const truncated = text.split(/\s+/).slice(0, 512).join(" ");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output = await (extractor as any)(truncated, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await embedText(text));
  }
  return results;
}
