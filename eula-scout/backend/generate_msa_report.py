"""
generate_msa_report.py
Generates a detailed multi-page MSA Comparison Report PDF from JSON data.

Usage:
  python generate_msa_report.py <json_file> --output report.pdf
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

# ── Colours ───────────────────────────────────────────────────────────────────
C_ACCENT   = colors.HexColor("#003087")
C_RED      = colors.HexColor("#dc2626")
C_AMBER    = colors.HexColor("#d97706")
C_GREEN    = colors.HexColor("#059669")
C_GREY_BG  = colors.HexColor("#f3f4f6")
C_GREY_TXT = colors.HexColor("#6b7280")
C_DARK     = colors.HexColor("#111827")
C_WHITE    = colors.white
C_BORDER   = colors.HexColor("#e5e7eb")
C_LOW_BG   = colors.HexColor("#f0fdf4")
C_TITAN_BG = colors.HexColor("#eff6ff")

RISK_COLOUR = {
    "High":   (C_RED,    colors.HexColor("#fef2f2")),
    "Medium": (C_AMBER,  colors.HexColor("#fffbeb")),
    "Low":    (C_GREEN,  colors.HexColor("#f0fdf4")),
}

# Header/footer geometry
HEADER_H     = 14 * mm
FOOTER_H     = 10 * mm
SIDE_MARGIN  = 18 * mm
PAGE_W, PAGE_H = A4
FRAME_Y      = FOOTER_H + 2 * mm           # bottom of content frame
FRAME_TOP    = PAGE_H - HEADER_H - 2 * mm  # top of content frame
FRAME_H      = FRAME_TOP - FRAME_Y


def _risk_colours(r: str):
    return RISK_COLOUR.get(r, (C_GREY_TXT, C_GREY_BG))


# ── Styles ────────────────────────────────────────────────────────────────────
def build_styles() -> dict:
    base = getSampleStyleSheet()

    def s(name, parent="Normal", **kw):
        return ParagraphStyle(name, parent=base[parent], **kw)

    return {
        "title":      s("rpt_title",   fontSize=20, fontName="Helvetica-Bold", textColor=C_DARK,    spaceAfter=2),
        "subtitle":   s("rpt_sub",     fontSize=9,  fontName="Helvetica",      textColor=C_GREY_TXT, spaceAfter=3),
        "h1":         s("rpt_h1",      fontSize=12, fontName="Helvetica-Bold", textColor=C_ACCENT,  spaceBefore=0, spaceAfter=3),
        "h2":         s("rpt_h2",      fontSize=9,  fontName="Helvetica-Bold", textColor=C_DARK,    spaceBefore=0, spaceAfter=2),
        "body":       s("rpt_body",    fontSize=8.5, fontName="Helvetica",     textColor=C_DARK,    leading=13),
        "body_small": s("rpt_bs",      fontSize=7.5, fontName="Helvetica",     textColor=C_DARK,    leading=12),
        "label":      s("rpt_lbl",     fontSize=7,  fontName="Helvetica-Bold", textColor=C_GREY_TXT),
        "label_blue": s("rpt_lblb",    fontSize=7,  fontName="Helvetica-Bold", textColor=C_ACCENT),
        "label_red":  s("rpt_lblr",    fontSize=7,  fontName="Helvetica-Bold", textColor=C_RED),
        "label_grn":  s("rpt_lblg",    fontSize=7,  fontName="Helvetica-Bold", textColor=C_GREEN),
        "label_amb":  s("rpt_lbla",    fontSize=7,  fontName="Helvetica-Bold", textColor=C_AMBER),
        "prio_num":   s("rpt_pnum",    fontSize=9,  fontName="Helvetica-Bold", textColor=C_WHITE, alignment=TA_CENTER),
        # Per-risk deviation header badge styles (pre-created, not dynamic)
        "drc_high":   s("rpt_drch",    fontSize=8,  fontName="Helvetica-Bold", textColor=C_RED,   alignment=TA_RIGHT),
        "drc_medium": s("rpt_drcm",    fontSize=8,  fontName="Helvetica-Bold", textColor=C_AMBER, alignment=TA_RIGHT),
        "drc_low":    s("rpt_drcl",    fontSize=8,  fontName="Helvetica-Bold", textColor=C_GREEN, alignment=TA_RIGHT),
        # Per-risk importance styles for missing clauses
        "imp_high":   s("rpt_imph",    fontSize=7.5, fontName="Helvetica-Bold", textColor=C_RED),
        "imp_medium": s("rpt_impm",    fontSize=7.5, fontName="Helvetica-Bold", textColor=C_AMBER),
        "imp_low":    s("rpt_impl",    fontSize=7.5, fontName="Helvetica-Bold", textColor=C_GREEN),
    }


# ── Page header / footer ──────────────────────────────────────────────────────
def _header_footer(canvas, doc, vendor_name: str) -> None:
    canvas.saveState()
    w, h = A4
    # Header bar
    canvas.setFillColor(C_ACCENT)
    canvas.rect(0, h - HEADER_H, w, HEADER_H, fill=1, stroke=0)
    canvas.setFillColor(C_WHITE)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(SIDE_MARGIN, h - 8.5 * mm, "MSA COMPARISON REPORT  |  Titan Company Limited")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(w - SIDE_MARGIN, h - 8.5 * mm, vendor_name)
    # Footer bar
    canvas.setFillColor(C_GREY_BG)
    canvas.rect(0, 0, w, FOOTER_H, fill=1, stroke=0)
    canvas.setFillColor(C_GREY_TXT)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(SIDE_MARGIN, 3.5 * mm,
                      f"Confidential — Internal use only  |  Generated: {date.today().strftime('%d %b %Y')}")
    canvas.drawRightString(w - SIDE_MARGIN, 3.5 * mm, f"Page {doc.page}")
    canvas.restoreState()


# ── Section title helper ───────────────────────────────────────────────────────
def _section_header(text: str, styles: dict, page_break: bool = False) -> list:
    """Returns flowables for a section heading. Use page_break=True for new-page sections."""
    items: list = []
    if page_break:
        items.append(PageBreak())
    else:
        items.append(Spacer(1, 3 * mm))
    items.append(Paragraph(text.upper(), styles["h1"]))
    items.append(HRFlowable(width="100%", thickness=1.5, color=C_ACCENT, spaceAfter=3))
    return items


# ── Deviation card (flat single Table — allows page-splitting) ─────────────────
def _deviation_card(dev: dict, styles: dict, content_w: float) -> Table:
    """
    Build a single flat 2-column Table for one deviation.
    No nesting — ReportLab can split it across pages at row boundaries.
    Row 0 : [topic + clauseRef  |  risk badge]   <- header, colored background
    Row 1 : [TITAN'S POSITION   |  value]
    Row 2 : [VENDOR'S POSITION  |  value]
    Row 3 : [OBJECTION          |  value]
    Row 4 : [RECOMMENDATION     |  value]
    """
    dev_risk = dev.get("risk", "Medium")
    dev_risk_col, dev_bg = _risk_colours(dev_risk)
    badge_style = styles.get(f"drc_{dev_risk.lower()}", styles["drc_medium"])

    label_w = content_w * 0.22
    value_w = content_w - label_w

    header_topic = f'<b>{dev.get("topic", "—")}</b>'
    clause_ref   = dev.get("clauseRef", "")
    if clause_ref:
        header_topic = f'{header_topic}  <font size="7" color="#6b7280">{clause_ref}</font>'

    rows = [
        # Row 0 — header
        [Paragraph(header_topic, styles["body"]),
         Paragraph(f"<b>{dev_risk}</b>", badge_style)],
        # Row 1-4 — detail rows
        [Paragraph("TITAN'S POSITION",  styles["label_blue"]),
         Paragraph(dev.get("titanPosition", ""), styles["body_small"])],
        [Paragraph("VENDOR'S POSITION", styles["label_red"]),
         Paragraph(dev.get("vendorPosition", ""), styles["body_small"])],
        [Paragraph("OBJECTION",         styles["label_amb"]),
         Paragraph(dev.get("objection", ""), styles["body_small"])],
        [Paragraph("RECOMMENDATION",    styles["label_grn"]),
         Paragraph(dev.get("recommendation", ""), styles["body_small"])],
    ]

    tbl = Table(
        rows,
        colWidths=[label_w, value_w],
        splitByRow=True,
        repeatRows=1,          # repeat header row if table splits across pages
        style=TableStyle([
            # Header row
            ("BACKGROUND",  (0, 0), (-1, 0), dev_bg),
            ("TOPPADDING",  (0, 0), (-1, 0), 6),
            ("BOTTOMPADDING",(0, 0), (-1, 0), 6),
            ("LEFTPADDING", (0, 0), (-1, 0), 6),
            ("RIGHTPADDING",(0, 0), (-1, 0), 6),
            ("SPAN",        (0, 0), (0, 0)),   # no actual span, just explicit
            ("VALIGN",      (0, 0), (-1, 0), "MIDDLE"),
            # Detail rows — label column
            ("BACKGROUND",  (0, 1), (0, -1), C_GREY_BG),
            ("TOPPADDING",  (0, 1), (0, -1), 5),
            ("BOTTOMPADDING",(0, 1),(0, -1), 5),
            ("LEFTPADDING", (0, 1), (0, -1), 5),
            ("RIGHTPADDING",(0, 1), (0, -1), 4),
            ("VALIGN",      (0, 1), (0, -1), "TOP"),
            # Detail rows — value column
            ("BACKGROUND",  (1, 1), (1, -1), C_WHITE),
            ("TOPPADDING",  (1, 1), (1, -1), 5),
            ("BOTTOMPADDING",(1, 1),(1, -1), 5),
            ("LEFTPADDING", (1, 1), (1, -1), 5),
            ("RIGHTPADDING",(1, 1), (1, -1), 6),
            ("VALIGN",      (1, 1), (1, -1), "TOP"),
            # Borders
            ("INNERGRID",   (0, 0), (-1, -1), 0.3, C_BORDER),
            ("BOX",         (0, 0), (-1, -1), 1,   dev_risk_col),
        ]),
    )
    return tbl


# ── Main story builder ─────────────────────────────────────────────────────────
def build_story(data: dict, styles: dict, content_w: float) -> list:
    story: list = []

    # ── Cover / summary block ─────────────────────────────────────────────────
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        data.get("msaTitle") or data.get("vendorName", "Vendor MSA"),
        styles["title"],
    ))
    story.append(Paragraph(
        f'Vendor: <b>{data.get("vendorName", "—")}</b>'
        f'  ·  Effective Date: <b>{data.get("effectiveDate", "[TBD]")}</b>',
        styles["subtitle"],
    ))

    risk = data.get("overallRisk", "Medium")
    risk_col, risk_bg = _risk_colours(risk)
    story.append(Table(
        [[Paragraph(f'Overall Risk: <b>{risk}</b>',
                    ParagraphStyle("rpt_cr", parent=styles["body"],
                                   textColor=risk_col, fontName="Helvetica-Bold"))]],
        colWidths=[content_w],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), risk_bg),
            ("BOX",        (0, 0), (-1, -1), 1.5, risk_col),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING",(0, 0),(-1,-1), 5),
            ("LEFTPADDING",(0, 0), (-1, -1), 8),
        ]),
    ))

    # ── Executive Summary ────────────────────────────────────────────────────
    story += _section_header("Executive Summary", styles, page_break=False)
    story.append(Paragraph(data.get("executiveSummary", ""), styles["body"]))

    # Risk overview table
    risk_rows = []
    for label, key in [("Data Privacy Risk", "dataPrivacyRisk"),
                       ("Liability Risk",     "liabilityRisk"),
                       ("Termination Risk",   "terminationRisk")]:
        val = data.get(key, "")
        if val:
            risk_rows.append([Paragraph(label, styles["h2"]),
                               Paragraph(val, styles["body_small"])])
    if risk_rows:
        story.append(Spacer(1, 2 * mm))
        story.append(Table(
            risk_rows,
            colWidths=[content_w * 0.26, content_w * 0.74],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), C_GREY_BG),
                ("BACKGROUND", (1, 0), (1, -1), C_WHITE),
                ("BOX",        (0, 0), (-1, -1), 0.5, C_BORDER),
                ("INNERGRID",  (0, 0), (-1, -1), 0.3, C_BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING",(0,0),(-1,-1), 4),
                ("LEFTPADDING",(0, 0), (-1, -1), 5),
                ("VALIGN",     (0, 0), (-1, -1), "TOP"),
            ]),
        ))

    # ── Negotiation Priorities ────────────────────────────────────────────────
    priorities = data.get("topNegotiationPriorities", [])
    if priorities:
        story += _section_header("Top Negotiation Priorities", styles, page_break=False)
        prio_rows = []
        for i, p in enumerate(priorities, 1):
            prio_rows.append([
                Paragraph(str(i), styles["prio_num"]),
                Paragraph(p, styles["body"]),
            ])
        story.append(Table(
            prio_rows,
            colWidths=[8 * mm, content_w - 8 * mm],
            style=TableStyle([
                ("BACKGROUND",   (0, 0), (0, -1), C_RED),
                ("TOPPADDING",   (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
                ("LEFTPADDING",  (0, 0), (0, -1), 2),
                ("RIGHTPADDING", (0, 0), (0, -1), 2),
                ("LEFTPADDING",  (1, 0), (1, -1), 6),
                ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
                ("LINEBELOW",    (0, 0), (-1, -2), 0.3, C_BORDER),
            ]),
        ))

    # ── Deviations — each on its own page block ───────────────────────────────
    deviations = data.get("deviations", [])
    if deviations:
        story += _section_header(
            f"Deviations from Titan Template  ({len(deviations)})",
            styles, page_break=True,
        )
        for dev in deviations:
            card = _deviation_card(dev, styles, content_w)
            story.append(card)
            story.append(Spacer(1, 2.5 * mm))

    # ── Missing Clauses ───────────────────────────────────────────────────────
    missing = data.get("missingClauses", [])
    if missing:
        story += _section_header(
            f"Missing Clauses  ({len(missing)})",
            styles, page_break=True,
        )
        mc_rows = [[
            Paragraph("CLAUSE",         styles["label"]),
            Paragraph("IMPORTANCE",     styles["label"]),
            Paragraph("RECOMMENDATION", styles["label"]),
        ]]
        for mc in missing:
            imp     = mc.get("importance", "Medium")
            imp_col, _ = _risk_colours(imp)
            imp_sty = styles.get(f"imp_{imp.lower()}", styles["imp_medium"])
            mc_rows.append([
                Paragraph(mc.get("clause", ""),         styles["body_small"]),
                Paragraph(f"<b>{imp}</b>",              imp_sty),
                Paragraph(mc.get("recommendation", ""), styles["body_small"]),
            ])
        story.append(Table(
            mc_rows,
            colWidths=[content_w * 0.30, content_w * 0.12, content_w * 0.58],
            repeatRows=1,
            splitByRow=True,
            style=TableStyle([
                ("BACKGROUND",   (0, 0), (-1, 0), C_ACCENT),
                ("TEXTCOLOR",    (0, 0), (-1, 0), C_WHITE),
                ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE",     (0, 0), (-1, 0), 7),
                ("TOPPADDING",   (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
                ("LEFTPADDING",  (0, 0), (-1, -1), 5),
                ("INNERGRID",    (0, 0), (-1, -1), 0.3, C_BORDER),
                ("BOX",          (0, 0), (-1, -1), 0.5, C_ACCENT),
                ("VALIGN",       (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_WHITE, C_GREY_BG]),
            ]),
        ))

    # ── Favourable Clauses ────────────────────────────────────────────────────
    favourable = data.get("favorableClauses", [])
    if favourable:
        story += _section_header(
            f"Favourable Clauses  ({len(favourable)})",
            styles, page_break=True,
        )
        fav_rows = [[
            Paragraph("CLAUSE / SECTION", styles["label"]),
            Paragraph("TOPIC",            styles["label"]),
            Paragraph("WHY FAVOURABLE",   styles["label"]),
        ]]
        for fc in favourable:
            fav_rows.append([
                Paragraph(fc.get("clauseRef", ""), styles["body_small"]),
                Paragraph(fc.get("topic", ""),     styles["body_small"]),
                Paragraph(fc.get("note", ""),      styles["body_small"]),
            ])
        story.append(Table(
            fav_rows,
            colWidths=[content_w * 0.20, content_w * 0.20, content_w * 0.60],
            repeatRows=1,
            splitByRow=True,
            style=TableStyle([
                ("BACKGROUND",   (0, 0), (-1, 0), C_GREEN),
                ("TEXTCOLOR",    (0, 0), (-1, 0), C_WHITE),
                ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE",     (0, 0), (-1, 0), 7),
                ("TOPPADDING",   (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
                ("LEFTPADDING",  (0, 0), (-1, -1), 5),
                ("INNERGRID",    (0, 0), (-1, -1), 0.3, C_BORDER),
                ("BOX",          (0, 0), (-1, -1), 0.5, C_GREEN),
                ("VALIGN",       (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_WHITE, C_LOW_BG]),
            ]),
        ))

    return story


# ── PDF generator ─────────────────────────────────────────────────────────────
def generate_report(data: dict, output_path: Path) -> None:
    vendor_name = data.get("vendorName", "Vendor")
    styles      = build_styles()
    content_w   = PAGE_W - 2 * SIDE_MARGIN

    doc = BaseDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=SIDE_MARGIN,
        rightMargin=SIDE_MARGIN,
        topMargin=HEADER_H + 2 * mm,
        bottomMargin=FOOTER_H + 2 * mm,
        title=f"MSA Report – {vendor_name}",
        author="Titan Company Limited",
    )

    frame = Frame(
        SIDE_MARGIN, FRAME_Y,
        content_w, FRAME_H,
        id="main",
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )

    doc.addPageTemplates([
        PageTemplate(
            id="main",
            frames=[frame],
            onPage=lambda cv, d: _header_footer(cv, d, vendor_name),
        )
    ])

    doc.build(build_story(data, styles, content_w))


# ── CLI entry point ───────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="Generate MSA Comparison Report PDF.")
    parser.add_argument("json_file", type=Path, help="JSON file with MSA analysis data")
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()

    if not args.json_file.exists():
        print(f"ERROR: File not found: {args.json_file}", file=sys.stderr)
        sys.exit(1)

    with open(args.json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    safe = data.get("vendorName", "Vendor").replace(" ", "_")
    output = args.output or Path(f"MSA_Report_{safe}.pdf")
    print(f"[INFO] Generating MSA report -> {output}")
    generate_report(data, output)
    print(f"[OK] Written: {output}")


if __name__ == "__main__":
    main()
