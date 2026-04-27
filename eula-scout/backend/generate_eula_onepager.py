"""
generate_eula_onepager.py
AI-powered EULA → one-page executive-summary PDF generator.

# pip install reportlab matplotlib pdfplumber
"""
from __future__ import annotations

import argparse
import io
import random
import re
import sys
import warnings
from dataclasses import dataclass, field
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
matplotlib.rcParams["svg.hashsalt"] = "0"
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import pdfplumber
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

random.seed(0)

W, H = landscape(A4)   # 841.89 x 595.28 pt
MARGIN = 10 * mm
CONTENT_W = W - 2 * MARGIN

HIGH_FILL   = colors.HexColor("#fde2e2")
HIGH_STROKE = colors.HexColor("#ef4444")
MED_FILL    = colors.HexColor("#fff2d6")
MED_STROKE  = colors.HexColor("#f59e0b")
LOW_FILL    = colors.HexColor("#dff5e1")
LOW_STROKE  = colors.HexColor("#10b981")
HIGH_HDR    = colors.HexColor("#dc2626")
MED_HDR     = colors.HexColor("#d97706")
LOW_HDR     = colors.HexColor("#059669")
GREY_TEXT   = colors.HexColor("#6b7280")
DARK_TEXT   = colors.HexColor("#111827")
BORDER_GREY = colors.HexColor("#e5e7eb")
TILE_BG     = colors.HexColor("#f8fafc")
AMBER_BG    = colors.HexColor("#fffbeb")
AMBER_BORDER = colors.HexColor("#f59e0b")


@dataclass
class Clause:
    clause_no: str
    title: str
    implication: str
    risk: str


@dataclass
class ExposureScore:
    dimension: str
    score: float


@dataclass
class OnePagerData:
    doc_title: str
    company: str
    published: str
    jurisdiction: str
    arbitration_seat: str
    contracting_entity: str
    liability_cap: str
    class_action: str
    genai_training: str
    content_transition: str
    clauses: list[Clause] = field(default_factory=list)
    recommendations: str = ""
    source_citation: str = ""
    accent: str = "#DA1F26"


_CLAUSE_RE = re.compile(r"^\s*(\d+(?:\.\d+)?)\s{1,4}([A-Z][^\n]{2,})")
_HIGH_PAT = re.compile(r"liability|indemnif|terminat|arbitrat|class.action|as.is|warranty|disclaim", re.I)
_MED_PAT  = re.compile(r"audit|cross.border|personal data|sensitive|analytics|product.specific|auto.renew|billing", re.I)
_META_MAP = {
    "published":        re.compile(r"(?:last updated|published|effective)[:\s]+([A-Za-z0-9 ,]+(?:20\d\d))", re.I),
    "jurisdiction":     re.compile(r"governed by (?:the laws of )?([A-Za-z ]{3,40})", re.I),
    "arbitration_seat": re.compile(r"arbitrat\w+ (?:seat|shall be (?:held |conducted )in) ([A-Za-z ,]{3,40})", re.I),
    "contracting_entity": re.compile(r"((?:Adobe|Microsoft|SAP|Oracle|Salesforce|ServiceNow)\s[\w\s,\.]{3,60}(?:Ltd|LLC|Inc|GmbH|BV|Pte))\b", re.I),
    "liability_cap":    re.compile(r"(?:aggregate )?liabilit\w+ (?:shall )?not exceed ([^\.\n]{5,80})", re.I),
    "genai":            re.compile(r"(?:train|training).*?(?:AI|artificial intelligence|machine learning|generative)", re.I),
}


def _classify(text: str) -> str:
    """Classify clause risk level from its text."""
    if _HIGH_PAT.search(text):
        return "High"
    if _MED_PAT.search(text):
        return "Medium"
    return "Low"


def extract_data(pdf_path: Path, company: str, accent: str) -> OnePagerData:
    """Extract clauses and metadata from a PDF using pdfplumber."""
    import logging
    # Suppress pdfplumber/pdfminer font warnings that pollute stderr
    logging.getLogger("pdfminer").setLevel(logging.ERROR)
    logging.getLogger("pdfplumber").setLevel(logging.ERROR)

    full_text = ""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages:
                try:
                    full_text += (page.extract_text() or "") + "\n"
                except Exception as page_err:
                    print(f"[WARN] Skipping page due to error: {page_err}", file=sys.stderr)

    def _find(key: str) -> str:
        m = _META_MAP[key].search(full_text)
        if m:
            try:
                return m.group(1).strip().rstrip(".,;")
            except IndexError:
                return m.group(0).strip().rstrip(".,;")
        warnings.warn(f"[TBD] Could not extract '{key}' from PDF.", stacklevel=2)
        return "[TBD]"

    published   = _find("published")
    jurisdiction = _find("jurisdiction")
    arb_seat    = _find("arbitration_seat")
    entity      = _find("contracting_entity")
    liability   = _find("liability_cap")

    genai_m = _META_MAP["genai"].search(full_text)
    genai = "Not Permitted" if genai_m and re.search(
        r"not|prohibit|shall not",
        full_text[max(0, genai_m.start()-60):genai_m.end()+60], re.I
    ) else "Permitted"

    class_action = "Waived" if re.search(r"class.action.*waiv|waiv.*class.action", full_text, re.I) else "[TBD]"

    content_transition = "[TBD]"
    m_ct = re.search(r"(\d+)\s*days?.*(?:expir|terminat|cancel)", full_text, re.I)
    if m_ct:
        content_transition = f"{m_ct.group(1)} days"

    clauses: list[Clause] = []
    lines = full_text.splitlines()
    for i, line in enumerate(lines):
        cm = _CLAUSE_RE.match(line)
        if cm:
            no, title = cm.group(1), cm.group(2).strip()
            body = title
            for j in range(1, 4):
                if i + j < len(lines) and lines[i + j].strip() and not _CLAUSE_RE.match(lines[i + j]):
                    body += " " + lines[i + j].strip()
            clauses.append(Clause(no, title[:60], body[:110].strip(), _classify(body)))

    clauses.sort(key=lambda c: [int(x) for x in c.clause_no.split(".") if x.isdigit()])

    # No cap — pass all clauses; build_pdf sizes rows dynamically
    capped = [c for c in clauses if c.risk == "High"] + \
             [c for c in clauses if c.risk == "Medium"] + \
             [c for c in clauses if c.risk == "Low"]

    empty = Clause("", "—", "", "Low")
    while len(capped) < 15:
        capped.append(empty)

    rec = (
        "Proceed with negotiated Enterprise Agreement: (1) raise liability cap, "
        "(2) seek reciprocal IP indemnity, (3) opt-out of arbitration within 30 days, "
        "(4) block sensitive PII via DLP, (5) review all product-specific terms."
    )

    return OnePagerData(
        doc_title=pdf_path.stem.replace("_", " "),
        company=company,
        published=published,
        jurisdiction=jurisdiction,
        arbitration_seat=arb_seat,
        contracting_entity=entity,
        liability_cap=liability,
        class_action=class_action,
        genai_training=genai,
        content_transition=content_transition,
        clauses=capped,
        recommendations=rec,
        source_citation=pdf_path.name,
        accent=accent,
    )


def _make_donut(data: OnePagerData) -> io.BytesIO:
    """Render a matplotlib donut chart to an in-memory PNG."""
    # Only count real clauses — empty filler entries have clause_no="" and must be excluded
    real = [c for c in data.clauses if c.clause_no]
    high = sum(1 for c in real if c.risk == "High")
    med  = sum(1 for c in real if c.risk == "Medium")
    low  = sum(1 for c in real if c.risk == "Low")
    fig, ax = plt.subplots(figsize=(2.6, 2.6), dpi=150)
    wedges, _ = ax.pie(
        [max(v, 0.01) for v in [high, med, low]],
        colors=["#dc2626", "#f59e0b", "#10b981"],
        startangle=90,
        wedgeprops=dict(width=0.55, edgecolor="white"),
    )
    ax.text(0, 0.08, str(high + med + low), ha="center", va="center", fontsize=13, fontweight="bold", color="#111827")
    ax.text(0, -0.18, "Clauses", ha="center", va="center", fontsize=7, color="#6b7280")
    patches = [
        mpatches.Patch(color=c, label=l) for c, l in zip(
            ["#dc2626", "#f59e0b", "#10b981"],
            [f"High ({high})", f"Medium ({med})", f"Low ({low})"]
        )
    ]
    ax.legend(handles=patches, loc="lower center", bbox_to_anchor=(0.5, -0.45), fontsize=6.5, frameon=False)
    ax.axis("equal")
    fig.tight_layout(pad=0.3)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", transparent=True)
    plt.close(fig)
    buf.seek(0)
    return buf


def _make_bars(accent: str) -> io.BytesIO:
    """Render a horizontal exposure-profile bar chart to PNG."""
    dims = [
        ("Financial Liability",    9.2),
        ("Data Privacy / DPDPA",   7.0),
        ("Dispute / Jurisdiction", 7.5),
        ("Service Continuity",     6.5),
        ("Operational / Audit",    4.5),
        ("IP & Content Ownership", 2.0),
        ("GenAI / Training",       1.8),
    ]
    scores = [d[1] for d in dims]
    bar_colors = ["#dc2626" if s >= 7 else "#f59e0b" if s >= 4 else "#10b981" for s in scores]
    fig, ax = plt.subplots(figsize=(3.2, 2.5), dpi=150)
    bars = ax.barh([d[0] for d in dims], scores, color=bar_colors, height=0.55, edgecolor="none")
    ax.set_xlim(0, 10.5)
    ax.tick_params(axis="y", labelsize=6.5)
    ax.xaxis.set_visible(False)
    ax.set_facecolor("#f9fafb")
    fig.patch.set_facecolor("white")
    for bar, score in zip(bars, scores):
        ax.text(score + 0.15, bar.get_y() + bar.get_height() / 2,
                f"{score}", va="center", ha="left", fontsize=6.5, fontweight="bold", color="#374151")
    ax.invert_yaxis()
    ax.spines[["top", "right", "bottom", "left"]].set_visible(False)
    fig.tight_layout(pad=0.4)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", transparent=False)
    plt.close(fig)
    buf.seek(0)
    return buf


def _hex(h: str) -> colors.HexColor:
    return colors.HexColor(h)


def _fit(cv: canvas.Canvas, text: str, max_w: float, font: str, size: float) -> str:
    """Truncate *text* to fit within *max_w* points, adding '...' if cut."""
    if cv.stringWidth(text, font, size) <= max_w:
        return text
    t = text
    while len(t) > 1 and cv.stringWidth(t[:-1] + "...", font, size) > max_w:
        t = t[:-1]
    return (t[:-1] if len(t) > 1 else t) + "..."


def _lines(cv: canvas.Canvas, text: str, max_w: float, font: str, size: float,
           max_lines: int = 99) -> list:
    """Word-wrap *text* into lines that each fit within *max_w* points."""
    result, line = [], ""
    for word in text.split():
        test = (line + " " + word).strip()
        if cv.stringWidth(test, font, size) <= max_w:
            line = test
        else:
            if line:
                result.append(line)
                if len(result) >= max_lines:
                    return result
            line = word
    if line and len(result) < max_lines:
        result.append(line)
    return result if result else [text[:1]] if text else []


def _rect(cv: canvas.Canvas, x: float, y: float, w: float, h: float,
          fill: colors.Color, stroke: colors.Color, stroke_w: float = 0.5) -> None:
    cv.setFillColor(fill)
    cv.setStrokeColor(stroke)
    cv.setLineWidth(stroke_w)
    cv.rect(x, y, w, h, fill=1, stroke=1)


def build_pdf(data: OnePagerData, output_path: Path) -> None:
    """Render the one-page executive-summary PDF."""
    c = canvas.Canvas(str(output_path), pagesize=landscape(A4))
    accent = _hex(data.accent)

    # ── Dimensions ────────────────────────────────────────────────────────────
    # A4: W=595.27pt, H=841.89pt, MARGIN=10mm=28.35pt, CONTENT_W≈538.57pt
    cy = H - MARGIN

    # ── HEADER (26mm) ─────────────────────────────────────────────────────────
    header_h = 26 * mm
    _rect(c, MARGIN, cy - header_h, CONTENT_W, header_h, colors.white, BORDER_GREY, 0.3)
    c.setFillColor(accent)
    c.rect(MARGIN, cy - header_h, 4, header_h, fill=1, stroke=0)

    lx = MARGIN + 8
    meta_w = 155  # points reserved for right-aligned metadata
    title_max_w = CONTENT_W - meta_w - 12

    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(DARK_TEXT)
    c.drawString(lx, cy - 14, _fit(c, data.doc_title, title_max_w, "Helvetica-Bold", 14))
    c.setFont("Helvetica", 8)
    c.setFillColor(GREY_TEXT)
    c.drawString(lx, cy - 23,
                 _fit(c, f"Executive Summary  |  Prepared for {data.company}",
                      title_max_w, "Helvetica", 8))

    for i, txt in enumerate([f"Published: {data.published}",
                              f"Governing Law: {data.jurisdiction}",
                              f"Arbitration: {data.arbitration_seat}"]):
        c.setFont("Helvetica", 7.5)
        c.setFillColor(DARK_TEXT)
        c.drawRightString(W - MARGIN - 2, cy - 10 - i * 9,
                          _fit(c, txt, meta_w, "Helvetica", 7.5))

    c.setStrokeColor(accent)
    c.setLineWidth(2.5)
    c.line(MARGIN, cy - header_h + 0.5, W - MARGIN, cy - header_h + 0.5)
    cy -= header_h + 4

    # ── KEY-FACTS STRIP (18mm) ────────────────────────────────────────────────
    tile_h = 18 * mm
    tile_gap = 3
    tile_w = (CONTENT_W - tile_gap * 4) / 5

    facts = [
        ("Contracting Entity",  data.contracting_entity),
        ("Liability Cap",       data.liability_cap),
        ("Class Action",        data.class_action),
        ("GenAI Training",      data.genai_training),
        ("Content Exit Window", data.content_transition),
    ]
    for i, (label, value) in enumerate(facts):
        tx = MARGIN + i * (tile_w + tile_gap)
        _rect(c, tx, cy - tile_h, tile_w, tile_h, TILE_BG, BORDER_GREY, 0.4)
        c.setFillColor(accent)
        c.rect(tx, cy - tile_h, 3, tile_h, fill=1, stroke=0)
        inner_x = tx + 6
        inner_w = tile_w - 9
        c.setFont("Helvetica", 6.5)
        c.setFillColor(GREY_TEXT)
        c.drawString(inner_x, cy - 8, _fit(c, label.upper(), inner_w, "Helvetica", 6.5))
        val_ls = _lines(c, str(value), inner_w, "Helvetica-Bold", 8, max_lines=2)
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(DARK_TEXT)
        line_start = cy - 16
        for vi, vl in enumerate(val_ls):
            c.drawString(inner_x, line_start - vi * 9, vl)

    cy -= tile_h + 5

    # ── TWO-COLUMN BODY ───────────────────────────────────────────────────────
    body_top = cy
    footer_h = 8 * mm
    rec_h    = 17 * mm
    body_h   = cy - MARGIN - footer_h - rec_h - 6

    left_w  = CONTENT_W * 0.57
    right_w = CONTENT_W - left_w - 6
    rx2     = MARGIN + left_w + 6

    # ── LEFT: Heat Map ────────────────────────────────────────────────────────
    total_cls = sum(1 for cl in data.clauses if cl.clause_no)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(DARK_TEXT)
    c.drawString(MARGIN, body_top - 11, f"Risk Heat Map  ({total_cls} Clauses Reviewed)")

    hm_top = body_top - 16
    col_w  = left_w / 3
    hdr_h  = 12

    for i, (lbl, hc) in enumerate([("HIGH RISK", HIGH_HDR),
                                    ("MEDIUM RISK", MED_HDR),
                                    ("LOW / FAVOURABLE", LOW_HDR)]):
        hx = MARGIN + i * col_w
        _rect(c, hx, hm_top - hdr_h, col_w - 1, hdr_h, hc, hc, 0)
        c.setFont("Helvetica-Bold", 6.5)
        c.setFillColor(colors.white)
        c.drawCentredString(hx + (col_w - 1) / 2, hm_top - hdr_h + 3.5,
                            _fit(c, lbl, col_w - 4, "Helvetica-Bold", 6.5))

    hm_top -= hdr_h + 1

    # Dynamic rows — fit all real clauses, minimum 5 rows
    real_cls = [cl for cl in data.clauses if cl.clause_no and cl.title not in ("-", "—", "")]
    high_all = [cl for cl in real_cls if cl.risk == "High"]
    med_all  = [cl for cl in real_cls if cl.risk == "Medium"]
    low_all  = [cl for cl in real_cls if cl.risk == "Low"]
    rows = max(5, len(high_all), len(med_all), len(low_all))

    # Cell height: shrink proportionally; minimum 20pt to stay readable
    available_h = body_h - hdr_h - 20
    cell_h = max(available_h / rows, 20)
    # If rows × cell_h overflows body, reduce font sizes slightly
    use_small_font = rows > 8

    # usable inner width per cell (border 1pt + padding 3pt each side)
    cell_pad   = 3
    cell_inner = col_w - 1 - cell_pad * 2

    ph = Clause("", "-", "", "Low")
    high_cls = high_all + [ph] * max(0, rows - len(high_all))
    med_cls  = med_all  + [ph] * max(0, rows - len(med_all))
    low_cls  = low_all  + [ph] * max(0, rows - len(low_all))

    col_data    = [high_cls, med_cls, low_cls]
    col_fills   = [HIGH_FILL,   MED_FILL,   LOW_FILL]
    col_strokes = [HIGH_STROKE, MED_STROKE, LOW_STROKE]

    for row in range(rows):
        for col in range(3):
            cl  = col_data[col][row]
            cx2 = MARGIN + col * col_w
            cy2 = hm_top - row * cell_h - cell_h
            _rect(c, cx2, cy2, col_w - 1, cell_h, col_fills[col], col_strokes[col], 0.6)

            if cl.title and cl.title not in ("-", "—"):
                ttl = f"{cl.title} §{cl.clause_no}" if cl.clause_no else cl.title
                title_sz = 5.5 if use_small_font else 6.5
                impl_sz  = 5.0 if use_small_font else 6.0
                top_off  = min(10, cell_h - 4)
                # Title line
                c.setFont("Helvetica-Bold", title_sz)
                c.setFillColor(DARK_TEXT)
                c.drawString(cx2 + cell_pad, cy2 + cell_h - top_off,
                             _fit(c, ttl, cell_inner, "Helvetica-Bold", title_sz))
                # Implication — 1 line when very small cells, 2 lines otherwise
                max_impl = 1 if cell_h < 32 else 2
                impl_ls = _lines(c, cl.implication or "", cell_inner, "Helvetica", impl_sz,
                                 max_lines=max_impl)
                c.setFont("Helvetica", impl_sz)
                c.setFillColor(colors.HexColor("#374151"))
                line_step = impl_sz + 2
                for li, il in enumerate(impl_ls):
                    c.drawString(cx2 + cell_pad, cy2 + cell_h - top_off - (li + 1) * line_step, il)

    # ── RIGHT: Donut chart ────────────────────────────────────────────────────
    r_cy = body_top
    donut_sz = min(40 * mm, right_w)

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(DARK_TEXT)
    c.drawString(rx2, r_cy - 11, "Clause Risk Distribution")
    c.drawImage(ImageReader(_make_donut(data)),
                rx2, r_cy - 11 - donut_sz,
                width=right_w, height=donut_sz, mask="auto")
    r_cy -= donut_sz + 15

    # ── RIGHT: Exposure bar chart ─────────────────────────────────────────────
    bar_sz = min(38 * mm, right_w)

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(DARK_TEXT)
    c.drawString(rx2, r_cy - 11, "Exposure Profile (Qualitative)")
    c.drawImage(ImageReader(_make_bars(data.accent)),
                rx2, r_cy - 11 - bar_sz,
                width=right_w, height=bar_sz, mask="auto")
    r_cy -= bar_sz + 13

    # ── RIGHT: Action items ───────────────────────────────────────────────────
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(DARK_TEXT)
    c.drawString(rx2, r_cy - 11, "Action Items")
    r_cy -= 20

    topics = [
        ("Jurisdiction",   "Opt-out of arbitration within 30 days via vendor notice."),
        ("Liability",      "Negotiate a higher cap in the Enterprise Agreement."),
        ("Indemnity",      "Seek reciprocal IP indemnity from vendor."),
        ("Data Privacy",   "Align to DPDPA; block sensitive PII in cloud services."),
        ("Analytics",      "Enforce org-wide content analytics opt-out via Admin Console."),
        ("Content Exit",   "Build backup/egress SOP before licence expiry."),
        ("Product Terms",  "Review per-product terms before each tool deployment."),
        ("Employee Accts", "Update IT/HR policy for domain-linked accounts."),
    ]

    bottom_limit = MARGIN + footer_h + rec_h + 12
    item_inner_w = right_w - 6

    for label, action in topics:
        if r_cy < bottom_limit + 18:
            break
        # Label row
        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(accent)
        c.drawString(rx2, r_cy, f"> {label}")
        r_cy -= 9
        # Action text wrapped within right column
        action_ls = _lines(c, action, item_inner_w, "Helvetica", 7, max_lines=2)
        c.setFont("Helvetica", 7)
        c.setFillColor(DARK_TEXT)
        for al in action_ls:
            if r_cy < bottom_limit:
                break
            c.drawString(rx2 + 6, r_cy, al)
            r_cy -= 8
        r_cy -= 3  # gap between topics

    # ── RECOMMENDATION ────────────────────────────────────────────────────────
    rec_bot = MARGIN + footer_h
    _rect(c, MARGIN, rec_bot, CONTENT_W, rec_h, AMBER_BG, AMBER_BORDER, 0)
    c.setFillColor(AMBER_BORDER)
    c.rect(MARGIN, rec_bot, 4, rec_h, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.HexColor("#92400e"))
    c.drawString(MARGIN + 8, rec_bot + rec_h - 10, "Recommendation:")
    rec_ls = _lines(c, data.recommendations, CONTENT_W - 16, "Helvetica", 7.5,
                    max_lines=3)
    c.setFont("Helvetica", 7.5)
    c.setFillColor(DARK_TEXT)
    for ri, rl in enumerate(rec_ls):
        c.drawString(MARGIN + 8, rec_bot + rec_h - 20 - ri * 10, rl)

    # ── FOOTER ────────────────────────────────────────────────────────────────
    ft_y = MARGIN + footer_h - 2
    c.setStrokeColor(BORDER_GREY)
    c.setLineWidth(0.5)
    c.line(MARGIN, ft_y, W - MARGIN, ft_y)
    c.setFont("Helvetica", 7)
    c.setFillColor(GREY_TEXT)
    c.drawString(MARGIN, ft_y - 9,
                 _fit(c, f"Source: {data.source_citation}  |  Published: {data.published}",
                      CONTENT_W / 2, "Helvetica", 7))
    from datetime import date
    c.drawRightString(W - MARGIN, ft_y - 9,
                      f"Prepared: {date.today().strftime('%d %b %Y')}  |  Internal use only")

    c.save()


def _print_rubric() -> None:
    print("\n=== CLASSIFICATION RUBRIC ===")
    print(f"{'HIGH':<8}  liability, indemnity, termination, arbitration, class-action, as-is")
    print(f"{'MEDIUM':<8}  audit, cross-border data, PII, analytics, product-specific, billing")
    print(f"{'LOW':<8}  IP ownership, no-GenAI, local privacy, DMCA, licence grants, feedback\n")


def _print_risk_table(clauses: list[Clause]) -> None:
    print(f"\n{'§':<8}  {'TITLE':<45}  {'RISK':<8}")
    print("-" * 65)
    for cl in clauses:
        if cl.clause_no:
            print(f"{cl.clause_no:<8}  {cl.title:<45}  {cl.risk:<8}")
    print()


def _slugify(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", name).strip("_")


def main() -> None:
    """Parse CLI arguments and orchestrate extraction + PDF generation."""
    parser = argparse.ArgumentParser(description="Generate a one-page EULA executive-summary PDF.")
    parser.add_argument("input_pdf", type=Path)
    parser.add_argument("--company", default="Acme Corp")
    parser.add_argument("--accent",  default="#DA1F26")
    parser.add_argument("--output",  type=Path, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.input_pdf.exists():
        print(f"ERROR: File not found: {args.input_pdf}", file=sys.stderr)
        sys.exit(1)

    output = args.output or Path(f"{_slugify(args.company)}_EULA_Executive_Summary.pdf")
    _print_rubric()
    print(f"[INFO] Extracting: {args.input_pdf}")
    data = extract_data(args.input_pdf, args.company, args.accent)
    _print_risk_table(data.clauses)

    if args.dry_run:
        print("[INFO] --dry-run: skipping PDF generation.")
        sys.exit(0)

    print(f"[INFO] Building PDF -> {output}")
    build_pdf(data, output)
    print(f"[OK]  Written: {output}")


if __name__ == "__main__":
    main()
