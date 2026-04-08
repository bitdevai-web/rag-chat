export function splitIntoChunks(
  text: string,
  chunkSize = 512,
  overlap = 50
): string[] {
  // Split by words to avoid cutting mid-word
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const slice = words.slice(i, i + chunkSize);
    const chunk = slice.join(" ").trim();
    if (chunk) chunks.push(chunk);
    i += chunkSize - overlap;
    if (i < 0) break;
  }

  return chunks;
}
