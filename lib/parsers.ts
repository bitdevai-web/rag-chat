export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  // Plain text / markdown / CSV
  if (
    mimeType === "text/plain" ||
    mimeType === "text/csv" ||
    ext === "txt" ||
    ext === "md" ||
    ext === "csv"
  ) {
    return buffer.toString("utf-8");
  }

  // PDF
  if (mimeType === "application/pdf" || ext === "pdf") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    return data.text;
  }

  // DOCX
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // PPTX — unzip and extract text from slide XML files
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    ext === "pptx"
  ) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries() as Array<{ entryName: string; getData: () => Buffer }>;

    const slideTexts: string[] = [];
    // Slides are at ppt/slides/slide*.xml, sorted by number
    const slideEntries = entries
      .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
      .sort((a, b) => {
        const numA = parseInt(a.entryName.match(/\d+/)?.[0] ?? "0");
        const numB = parseInt(b.entryName.match(/\d+/)?.[0] ?? "0");
        return numA - numB;
      });

    for (const entry of slideEntries) {
      const xml = entry.getData().toString("utf-8");
      // Extract text from <a:t> tags (DrawingML text elements)
      const matches = xml.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g);
      const texts: string[] = [];
      for (const m of matches) {
        const t = m[1].trim();
        if (t) texts.push(t);
      }
      if (texts.length) slideTexts.push(texts.join(" "));
    }

    return slideTexts.join("\n\n");
  }

  // XLSX / XLS — convert each sheet to tab-separated text
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    ext === "xlsx" ||
    ext === "xls"
  ) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const parts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv: string = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) {
        parts.push(`Sheet: ${sheetName}\n${csv}`);
      }
    }

    return parts.join("\n\n");
  }

  throw new Error(`Unsupported file type: ${mimeType || ext}`);
}
