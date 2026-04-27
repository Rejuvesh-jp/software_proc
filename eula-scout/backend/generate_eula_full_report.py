"""
generate_eula_full_report.py
Full detailed EULA analysis report — all AI-extracted sections in a
clean multi-page portrait PDF.

Usage:
  python generate_eula_full_report.py <json_file> --output report.pdf
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

W, H = A4          # 595.28 x 841.89 pt
MARGIN = 18 * mm
CONTENT_W = W - 2 * MARGIN

ACCENT   = colors.HexColor("#00C9B1")
DARK     = colors.HexColor("#111827")
MUTED    = colors.HexColor("#6b7280")
BORDER   = colors.HexColor("#e5e7eb")
BG_LIGHT = colors.HexColor("#f8fafc")

RISK_COLORS = {
    "critical": (colors.HexColor("#fde2e2"), colors.HexColor("#ef4444"), colors.HexColor("#dc2626")),
    "high":     (colors.HexColor("#fde2e2"), colors.HexColor("#ef4444"), colors.HexColor("#dc2626")),
    "medium":   (colors.HexColor("#fff2d6"), colors.HexColor("#f59e0b"), colors.HexColor("#d97706")),
    "low":      (colors.HexColor("#dff5e1"), colors.HexColor("#10b981"), colors.HexColor("#059669")),
}

def _hex(h: str) -> colors.HexColor:
    return colors.HexColor(h)

def _fit(cv, text: str, max_w: float, font: str, size: float) -> str:
    if cv.stringWidth(text, font, size) <= max_w:
        return text
    t = text
    while len(t) > 1 and cv.stringWidth(t[:-1] + "…", font, size) > max_w:
        t = t[:-1]
    return t[:-1] + "…"

def _wrap(cv, text: str, max_w: float, font: str, size: float) -> list[str]:
    result, line = [], ""
    for word in str(text).split():
        test = (line + " " + word).strip()
        if cv.stringWidth(test, font, size) <= max_w:
            line = test
        else:
            if line:
                result.append(line)
            line = word
    if line:
        result.append(line)
    return result or [""]


class PageWriter:
    """Manages Y cursor across pages."""
    def __init__(self, cv: canvas.Canvas):
        self.cv = cv
        self.y = H - MARGIN

    def need(self, pts: float, *, bottom: float = MARGIN + 20):
        if self.y - pts < bottom:
            self._new_page()

    def _new_page(self):
        self.cv.showPage()
        self._draw_footer()
        self.y = H - MARGIN

    def _draw_footer(self):
        self.cv.setFont("Helvetica", 7)
        self.cv.setFillColor(MUTED)
        self.cv.drawString(MARGIN, 10 * mm, "EULA Scout — Titan Company Ltd — Confidential")
        self.cv.drawRightString(W - MARGIN, 10 * mm, "AI-powered analysis. Always review with legal counsel.")

    def rule(self, color=BORDER, width=0.5):
        self.cv.setStrokeColor(color)
        self.cv.setLineWidth(width)
        self.cv.line(MARGIN, self.y, W - MARGIN, self.y)

    def skip(self, pts: float):
        self.y -= pts

    def text(self, txt: str, font: str, size: float, color=DARK, indent: float = 0,
             max_w: float | None = None):
        self.cv.setFont(font, size)
        self.cv.setFillColor(color)
        mw = max_w or (CONTENT_W - indent)
        self.cv.drawString(MARGIN + indent, self.y, _fit(self.cv, str(txt), mw, font, size))
        self.y -= size * 1.4

    def para(self, txt: str, font: str, size: float, color=DARK, indent: float = 0,
             line_gap: float = 2, max_w: float | None = None):
        """Wrap text and draw, advancing y."""
        mw = max_w or (CONTENT_W - indent)
        lines = _wrap(self.cv, str(txt), mw, font, size)
        self.cv.setFont(font, size)
        self.cv.setFillColor(color)
        for ln in lines:
            self.need(size + line_gap + 4)
            self.cv.drawString(MARGIN + indent, self.y, ln)
            self.y -= size + line_gap
        self.y -= 2

    def section_header(self, title: str):
        self.need(24)
        self.y -= 6
        self.cv.setFillColor(ACCENT)
        self.cv.rect(MARGIN, self.y - 2, CONTENT_W, 20, fill=1, stroke=0)
        self.cv.setFillColor(colors.white)
        self.cv.setFont("Helvetica-Bold", 10)
        self.cv.drawString(MARGIN + 6, self.y + 4, title.upper())
        self.y -= 26

    def kv_row(self, label: str, value: str):
        """Key-value row with subtle zebra."""
        row_h = 14
        self.need(row_h + 4)
        self.cv.setFillColor(BG_LIGHT)
        self.cv.setStrokeColor(BORDER)
        self.cv.setLineWidth(0.3)
        self.cv.rect(MARGIN, self.y - row_h + 4, CONTENT_W, row_h, fill=1, stroke=1)
        label_w = 55 * mm
        self.cv.setFont("Helvetica-Bold", 8)
        self.cv.setFillColor(MUTED)
        self.cv.drawString(MARGIN + 4, self.y - 6, _fit(self.cv, label, label_w - 6, "Helvetica-Bold", 8))
        self.cv.setFont("Helvetica", 8)
        self.cv.setFillColor(DARK)
        val_x = MARGIN + label_w
        val_w = CONTENT_W - label_w - 4
        self.cv.drawString(val_x, self.y - 6, _fit(self.cv, str(value or "—"), val_w, "Helvetica", 8))
        self.y -= row_h


def build_full_report(data: dict, output_path: Path) -> None:
    cv = canvas.Canvas(str(output_path), pagesize=A4)
    pw = PageWriter(cv)

    software = data.get("softwareName") or "Unknown Software"
    vendor   = data.get("vendor") or "Unknown Vendor"
    version  = data.get("eulaVersion") or "—"
    risk_lvl = (data.get("overallRiskLevel") or "Unknown").upper()
    risk_key = risk_lvl.lower()
    r_fill, r_stroke, r_text = RISK_COLORS.get(risk_key, RISK_COLORS["medium"])

    # ── COVER HEADER ─────────────────────────────────────────────────────────
    cv.setFillColor(DARK)
    cv.rect(0, H - 52 * mm, W, 52 * mm, fill=1, stroke=0)

    # Accent bar left
    cv.setFillColor(ACCENT)
    cv.rect(0, H - 52 * mm, 4, 52 * mm, fill=1, stroke=0)

    cv.setFont("Helvetica-Bold", 20)
    cv.setFillColor(colors.white)
    cv.drawString(MARGIN + 6, H - 20 * mm, _fit(cv, software, CONTENT_W - 80, "Helvetica-Bold", 20))

    cv.setFont("Helvetica", 10)
    cv.setFillColor(_hex("#8AABB8"))
    cv.drawString(MARGIN + 6, H - 30 * mm, f"Vendor: {vendor}   ·   Version: {version}")

    cv.setFont("Helvetica", 9)
    cv.setFillColor(_hex("#8AABB8"))
    cv.drawString(MARGIN + 6, H - 38 * mm, "EULA Full Analysis Report   ·   Prepared by EULA Scout for Titan Company Ltd")

    # Risk badge top-right
    badge_x = W - MARGIN - 60
    badge_y = H - 42 * mm
    cv.setFillColor(r_fill)
    cv.setStrokeColor(r_stroke)
    cv.setLineWidth(1)
    cv.roundRect(badge_x, badge_y, 56, 18, 4, fill=1, stroke=1)
    cv.setFont("Helvetica-Bold", 9)
    cv.setFillColor(r_text)
    cv.drawCentredString(badge_x + 28, badge_y + 5, f"RISK: {risk_lvl}")

    pw.y = H - 52 * mm - 10
    pw._draw_footer()

    # ── SUMMARY INFO ─────────────────────────────────────────────────────────
    pw.skip(8)
    pw.section_header("Document Summary")

    fields = [
        ("Software / Product",   software),
        ("Vendor",               vendor),
        ("EULA Version",         version),
        ("Overall Risk Level",   data.get("overallRiskLevel") or "—"),
        ("Risk Score",           str(data.get("riskScore") or "—")),
    ]
    for lbl, val in fields:
        pw.kv_row(lbl, val)

    # ── EXECUTIVE SUMMARY ────────────────────────────────────────────────────
    exec_summary = data.get("executiveSummary") or ""
    if exec_summary:
        pw.skip(10)
        pw.section_header("Executive Summary")
        pw.para(exec_summary, "Helvetica", 9, color=DARK, line_gap=3)

    # ── KEY CLAUSES ──────────────────────────────────────────────────────────
    clauses = data.get("keyClauses") or []
    if clauses:
        pw.skip(6)
        pw.section_header(f"Key Clauses ({len(clauses)} Identified)")

        for i, cl in enumerate(clauses, 1):
            title    = cl.get("title") or f"Clause {i}"
            summary  = cl.get("summary") or ""
            orig     = cl.get("originalText") or ""
            risk     = (cl.get("riskLevel") or "Low")
            rk       = risk.lower()
            cf, cs, ct = RISK_COLORS.get(rk, RISK_COLORS["low"])

            # Clause header row
            row_h = 18
            pw.need(row_h + 40)
            cv.setFillColor(cf)
            cv.setStrokeColor(cs)
            cv.setLineWidth(0.5)
            cv.rect(MARGIN, pw.y - row_h + 6, CONTENT_W, row_h, fill=1, stroke=1)

            # Number badge
            cv.setFillColor(ct)
            cv.circle(MARGIN + 10, pw.y - row_h / 2 + 6, 7, fill=1, stroke=0)
            cv.setFont("Helvetica-Bold", 7)
            cv.setFillColor(colors.white)
            cv.drawCentredString(MARGIN + 10, pw.y - row_h / 2 + 3, str(i))

            # Title
            cv.setFont("Helvetica-Bold", 9)
            cv.setFillColor(DARK)
            title_x = MARGIN + 22
            title_w = CONTENT_W - 70
            cv.drawString(title_x, pw.y - 8, _fit(cv, title, title_w, "Helvetica-Bold", 9))

            # Risk label right-aligned
            cv.setFont("Helvetica-Bold", 8)
            cv.setFillColor(ct)
            cv.drawRightString(MARGIN + CONTENT_W - 4, pw.y - 8, risk.upper())

            pw.y -= row_h + 2

            # Summary
            if summary:
                pw.para(summary, "Helvetica", 8.5, color=DARK, indent=8, line_gap=2.5)

            # Original text (collapsed into a lighter block)
            if orig:
                pw.need(20)
                cv.setFillColor(_hex("#f1f5f9"))
                cv.setStrokeColor(BORDER)
                cv.setLineWidth(0.3)
                orig_lines = _wrap(cv, orig, CONTENT_W - 20, "Helvetica-Oblique", 7.5)
                block_h = len(orig_lines) * 10 + 8
                pw.need(block_h + 4)
                cv.rect(MARGIN + 8, pw.y - block_h + 4, CONTENT_W - 16, block_h, fill=1, stroke=1)
                cv.setFont("Helvetica-Bold", 7)
                cv.setFillColor(MUTED)
                cv.drawString(MARGIN + 12, pw.y - 4, "ORIGINAL TEXT:")
                pw.y -= 12
                cv.setFont("Helvetica-Oblique", 7.5)
                cv.setFillColor(_hex("#374151"))
                for ol in orig_lines:
                    pw.need(10)
                    cv.drawString(MARGIN + 12, pw.y, ol)
                    pw.y -= 10
                pw.y -= 4

            pw.skip(6)

    # ── LEGAL & COMPLIANCE DETAILS ───────────────────────────────────────────
    sections = [
        ("Data Privacy",        data.get("dataPrivacy")),
        ("Intellectual Property", data.get("intellectualProperty")),
        ("Termination Policy",  data.get("terminationPolicy")),
        ("Auto-Renewal",        data.get("autoRenewal")),
        ("Liability Limitation", data.get("liabilityLimitation")),
    ]
    for title, content in sections:
        if content:
            pw.skip(6)
            pw.section_header(title)
            pw.para(content, "Helvetica", 9, color=DARK, line_gap=3)

    # ── PROHIBITED USES ──────────────────────────────────────────────────────
    prohibited = data.get("prohibitedUses") or []
    if prohibited:
        pw.skip(6)
        pw.section_header(f"Prohibited Uses ({len(prohibited)})")
        for item in prohibited:
            if isinstance(item, dict):
                label = item.get("use") or item.get("title") or str(item)
                detail = item.get("detail") or item.get("description") or ""
            else:
                label = str(item)
                detail = ""
            pw.need(16)
            cv.setFillColor(ACCENT)
            cv.circle(MARGIN + 5, pw.y + 2, 2.5, fill=1, stroke=0)
            pw.para(label, "Helvetica-Bold", 8.5, color=DARK, indent=12, line_gap=2)
            if detail:
                pw.para(detail, "Helvetica", 8, color=MUTED, indent=14, line_gap=2)

    # ── RECOMMENDATIONS ──────────────────────────────────────────────────────
    recommendations = data.get("recommendations") or []
    if recommendations:
        pw.skip(6)
        pw.section_header(f"Recommendations ({len(recommendations)})")
        for idx, item in enumerate(recommendations, 1):
            if isinstance(item, dict):
                label  = item.get("recommendation") or item.get("title") or str(item)
                detail = item.get("rationale") or item.get("detail") or ""
                priority = item.get("priority") or ""
            else:
                label  = str(item)
                detail = ""
                priority = ""

            pw.need(18)
            # Number
            cv.setFillColor(ACCENT)
            cv.setStrokeColor(ACCENT)
            cv.setLineWidth(0.5)
            cv.roundRect(MARGIN, pw.y - 4, 14, 14, 3, fill=1, stroke=0)
            cv.setFont("Helvetica-Bold", 7)
            cv.setFillColor(colors.white)
            cv.drawCentredString(MARGIN + 7, pw.y + 1, str(idx))

            title_x = MARGIN + 18
            title_w = CONTENT_W - 18 - (30 if priority else 0)
            cv.setFont("Helvetica-Bold", 9)
            cv.setFillColor(DARK)
            cv.drawString(title_x, pw.y + 1, _fit(cv, label, title_w, "Helvetica-Bold", 9))

            if priority:
                pri_color = _hex("#dc2626") if "high" in priority.lower() else (
                    _hex("#d97706") if "medium" in priority.lower() else _hex("#059669"))
                cv.setFont("Helvetica-Bold", 7)
                cv.setFillColor(pri_color)
                cv.drawRightString(MARGIN + CONTENT_W, pw.y + 1, priority.upper())

            pw.y -= 13
            if detail:
                pw.para(detail, "Helvetica", 8.5, color=MUTED, indent=18, line_gap=2.5)
            pw.skip(4)

    # ── FINAL FOOTER ─────────────────────────────────────────────────────────
    cv.save()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("json_file", help="Path to EULA analysis JSON")
    parser.add_argument("--output", required=True, help="Output PDF path")
    args = parser.parse_args()

    json_path = Path(args.json_file)
    if not json_path.exists():
        print(f"Error: {json_path} not found", file=sys.stderr)
        sys.exit(1)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    build_full_report(data, Path(args.output))
    print(f"[OK] Full report written to {args.output}")
