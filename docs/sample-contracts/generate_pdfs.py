#!/usr/bin/env python3
"""Generate PDF versions of the 3 sample contracts using fpdf2."""
from fpdf import FPDF
import os

BASE = os.path.dirname(os.path.abspath(__file__))

DOCS = [
    {
        "txt":  "baseline-standard-tc.txt",
        "pdf":  "baseline-standard-tc.pdf",
        "title": "Master Services Agreement — Standard Terms & Conditions",
        "subtitle": "Brainium Information Technologies Pvt Ltd | Version 3.1",
        "header_color": (37, 99, 235),   # blue
        "tag": "BASELINE DOCUMENT",
    },
    {
        "txt":  "vendor-contract-A-medium-risk.txt",
        "pdf":  "vendor-contract-A-medium-risk.pdf",
        "title": "Master Services Agreement",
        "subtitle": "CloudBridge Solutions Pvt Ltd  →  Brainium IT | Ref: CBS-2025-0312",
        "header_color": (217, 119, 6),   # amber
        "tag": "INCOMING CONTRACT - MEDIUM RISK",
    },
    {
        "txt":  "vendor-contract-B-high-risk.txt",
        "pdf":  "vendor-contract-B-high-risk.pdf",
        "title": "Software Development & Consulting Services Agreement",
        "subtitle": "NexGen Tech Ventures Ltd  →  Brainium IT | Ref: NGT-BIT-2025-0089",
        "header_color": (220, 38, 38),   # red
        "tag": "INCOMING CONTRACT - HIGH RISK",
    },
]

def make_pdf(doc: dict):
    txt_path = os.path.join(BASE, doc["txt"])
    pdf_path = os.path.join(BASE, doc["pdf"])

    with open(txt_path, "r", encoding="utf-8") as f:
        raw_lines = f.readlines()

    def clean(s):
        """Replace common Unicode chars with ASCII equivalents."""
        return (s
            .replace("\u2014", "--").replace("\u2013", "-")
            .replace("\u2018", "'").replace("\u2019", "'")
            .replace("\u201c", '"').replace("\u201d", '"')
            .replace("\u2022", "*").replace("\u2026", "...")
            .replace("\u00a0", " ").replace("\u2192", "->")
            .replace("\u2190", "<-").replace("\u00b7", ".")
            .replace("\u00d7", "x").replace("\u00e9", "e")
            .replace("\u2212", "-")
        )

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    r, g, b = doc["header_color"]

    # ── Cover banner ──────────────────────────────────────────────────────────
    pdf.set_fill_color(r, g, b)
    pdf.rect(0, 0, 210, 42, "F")

    pdf.set_xy(12, 7)
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(255, 255, 255)
    pdf.multi_cell(186, 7, clean(doc["title"]), align="L")

    pdf.set_xy(12, pdf.get_y() + 1)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(220, 220, 220)
    pdf.multi_cell(186, 5, clean(doc["subtitle"]), align="L")

    # Tag pill
    tag_y = 33
    pdf.set_fill_color(255, 255, 255)
    pdf.set_xy(12, tag_y)
    pdf.set_font("Helvetica", "B", 7.5)
    pdf.set_text_color(r, g, b)
    pdf.cell(0, 5, clean(f"  {doc['tag']}  "), border=1, fill=True)

    # ── Body ──────────────────────────────────────────────────────────────────
    pdf.set_xy(12, 48)
    pdf.set_text_color(30, 30, 30)

    for raw in raw_lines:
        line = clean(raw.rstrip("\n"))

        # Skip the redundant title block at top of txt (first 3 lines already in banner)
        stripped = line.strip()

        # Section headings: ALL CAPS lines like "2. PAYMENT TERMS"
        is_heading = (
            stripped
            and stripped == stripped.upper()
            and len(stripped) > 4
            and not stripped.startswith("─")
            and not stripped.startswith("━")
            and not stripped.startswith("=")
            and not all(c in "─━=─ " for c in stripped)
        )

        # Divider lines
        is_divider = stripped and all(c in "─━= \t" for c in stripped) and len(stripped) > 3

        if is_divider:
            y = pdf.get_y()
            if y > 275:
                pdf.add_page()
                y = pdf.get_y()
            pdf.set_draw_color(r, g, b)
            pdf.set_line_width(0.4)
            pdf.line(12, y + 1, 198, y + 1)
            pdf.set_y(y + 4)
            continue

        if is_heading:
            # Small spacing before heading
            y = pdf.get_y()
            if y > 10:
                pdf.set_y(y + 3)
            pdf.set_font("Helvetica", "B", 9.5)
            pdf.set_text_color(r, g, b)
            pdf.set_fill_color(r + 40 if r < 216 else 255,
                               g + 40 if g < 216 else 255,
                               b + 40 if b < 216 else 255)
            pdf.set_x(12)
            pdf.cell(186, 6, clean(f"  {stripped}"), fill=True, ln=True)
            pdf.set_y(pdf.get_y() + 1)
            pdf.set_text_color(30, 30, 30)
            continue

        # Empty line
        if not stripped:
            pdf.set_y(pdf.get_y() + 2)
            continue

        # Sub-clause (starts with number like "1.1" or "2.3")
        import re
        is_subclause = bool(re.match(r"^\d+\.\d+", stripped))

        pdf.set_font("Helvetica", "B" if is_subclause else "", 8.5)
        pdf.set_x(12)
        pdf.multi_cell(186, 5, clean(line), align="L")

    # ── Footer on every page ──────────────────────────────────────────────────
    pdf.set_y(-12)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, clean(f"CogniBase Contract Analysis  |  {doc['pdf']}  |  Page {pdf.page_no()}"), align="C")

    pdf.output(pdf_path)
    print(f"  ✓  {doc['pdf']}  ({os.path.getsize(pdf_path) // 1024} KB)")


if __name__ == "__main__":
    print("\nGenerating PDFs …\n")
    for doc in DOCS:
        make_pdf(doc)
    print("\nDone. Files saved to docs/sample-contracts/\n")
