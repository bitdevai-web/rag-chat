/**
 * ocr.ts
 * OCR pipeline for image-based PDFs (scanned documents).
 *
 * Strategy:
 *  1. pdftoppm (poppler)  → renders each PDF page to a PNG in a temp dir
 *  2. tesseract.js        → OCRs each PNG and returns text
 *  3. Cleanup             → temp dir removed
 *
 * Graceful fallback: if pdftoppm is not on PATH, throws a clear error
 * that surfaces to the user in the upload UI.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";
import { createWorker } from "tesseract.js";

const execFileAsync = promisify(execFile);

// Minimum meaningful text length from pdf-parse before we assume image PDF
export const IMAGE_PDF_THRESHOLD = 100; // chars

/**
 * Returns true if the extracted text looks like an image-only PDF.
 */
export function isImagePdf(extractedText: string, fileSize: number): boolean {
  const cleaned = extractedText.trim().replace(/\s+/g, " ");
  // Short text AND file is large (images take space)
  return cleaned.length < IMAGE_PDF_THRESHOLD && fileSize > 50_000;
}

/**
 * Full OCR pipeline for a PDF buffer.
 * Returns concatenated OCR text from all pages.
 */
export async function ocrPdf(buffer: Buffer): Promise<string> {
  // Write buffer to a temp file
  const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), "cognibase-ocr-"));
  const pdfPath = path.join(tmpDir, "input.pdf");
  const outBase = path.join(tmpDir, "page");

  try {
    fs.writeFileSync(pdfPath, buffer);

    // Step 1: Render PDF pages to PNGs using pdftoppm
    await execFileAsync("pdftoppm", [
      "-png",
      "-r", "200",       // 200 DPI — good quality, reasonable speed
      pdfPath,
      outBase,
    ]).catch((err) => {
      throw new Error(
        `pdftoppm not available or failed: ${err.message}. ` +
        `Install poppler-utils on your server: apt-get install poppler-utils`
      );
    });

    // Collect rendered PNGs (sorted by page number)
    const pages = fs
      .readdirSync(tmpDir)
      .filter((f) => f.startsWith("page") && f.endsWith(".png"))
      .sort()
      .map((f) => path.join(tmpDir, f));

    if (pages.length === 0) throw new Error("pdftoppm produced no page images");

    // Step 2: OCR each page with tesseract.js
    const worker = await createWorker("eng", 1, {
      logger: () => {}, // silence progress logs
    });

    const pageTexts: string[] = [];
    for (const pagePath of pages) {
      const { data } = await worker.recognize(pagePath);
      if (data.text.trim()) pageTexts.push(data.text.trim());
    }

    await worker.terminate();

    if (pageTexts.length === 0) throw new Error("OCR returned no text — the document may be blank or corrupted");

    return pageTexts.join("\n\n");
  } finally {
    // Always clean up temp files
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
