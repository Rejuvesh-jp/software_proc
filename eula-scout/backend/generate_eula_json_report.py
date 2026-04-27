"""
generate_eula_json_report.py
Build the EULA executive one-pager PDF from the AI-analysis JSON
(used when the original PDF is no longer available, e.g. from history).

Usage:
  python generate_eula_json_report.py <json_file> --output report.pdf
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Reuse all PDF-building code from the main one-pager module
from generate_eula_onepager import OnePagerData, Clause, build_pdf


def json_to_onepager(data: dict) -> OnePagerData:
    """Map EULA analysis JSON → OnePagerData for build_pdf()."""

    software = data.get("softwareName") or "Unknown Software"
    vendor   = data.get("vendor") or "Unknown Vendor"
    version  = data.get("eulaVersion") or "[TBD]"

    # ── Clauses → Clause objects ──────────────────────────────────────────────
    raw_clauses = data.get("keyClauses") or []
    clauses: list[Clause] = []
    for i, kc in enumerate(raw_clauses, 1):
        raw_risk = (kc.get("riskLevel") or "Low").strip().capitalize()
        # Map Critical → High for the 3-column heat map
        if raw_risk == "Critical":
            risk = "High"
        elif raw_risk in ("High", "Medium", "Low"):
            risk = raw_risk
        else:
            risk = "Low"
        clauses.append(Clause(
            clause_no=str(i),
            title=(kc.get("title") or "")[:60],
            implication=(kc.get("summary") or "")[:110],
            risk=risk,
        ))

    # Pass ALL clauses — build_pdf sizes rows dynamically to fit everything
    capped = clauses
    # Minimum 15 entries so the grid renders with at least 5 rows
    empty = Clause("", "—", "", "Low")
    while len(capped) < 15:
        capped.append(empty)

    # ── Key facts ─────────────────────────────────────────────────────────────
    liability    = (data.get("liabilityLimitation") or "[TBD]")[:80]
    auto_renewal = (data.get("autoRenewal") or "[TBD]")[:80]
    termination  = data.get("terminationPolicy") or ""

    # Try to detect content-exit window from termination policy text
    import re
    content_transition = "[TBD]"
    m = re.search(r"(\d+)\s*days?", termination, re.I)
    if m:
        content_transition = f"{m.group(1)} days"

    # Detect GenAI stance from prohibitedUses / recommendations
    prohibited = " ".join(data.get("prohibitedUses") or [])
    recs_text  = " ".join(data.get("recommendations") or [])
    genai_training = "Not Permitted" if re.search(
        r"(?:AI|machine.learning|generative|training).*(?:prohibit|not.permit|restrict)",
        prohibited + " " + recs_text, re.I
    ) else "Review Required"

    # ── Recommendations text ──────────────────────────────────────────────────
    recs_list = data.get("recommendations") or []
    if recs_list:
        rec_str = "  ".join(f"({i}) {r}" for i, r in enumerate(recs_list, 1))
    else:
        rec_str = (
            "Review key clauses with legal before signing. Negotiate liability cap, "
            "data privacy terms, and termination rights."
        )

    return OnePagerData(
        doc_title=f"{software} EULA",
        company="Titan Company Limited",
        published=version,
        jurisdiction="[See contract]",
        arbitration_seat="[See contract]",
        contracting_entity=vendor,
        liability_cap=liability,
        class_action="[See contract]",
        genai_training=genai_training,
        content_transition=content_transition,
        clauses=capped,
        recommendations=rec_str,
        source_citation=f"{software} – AI Analysis Report",
        accent="#DA1F26",
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate EULA one-pager PDF from analysis JSON."
    )
    parser.add_argument("json_file", type=Path, help="JSON file with EULA analysis data")
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()

    if not args.json_file.exists():
        print(f"ERROR: File not found: {args.json_file}", file=sys.stderr)
        sys.exit(1)

    with open(args.json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    safe = (data.get("softwareName") or "EULA").replace(" ", "_")
    output = args.output or Path(f"{safe}_Executive_Summary.pdf")

    print(f"[INFO] Building one-pager -> {output}")
    build_pdf(json_to_onepager(data), output)
    print(f"[OK] Written: {output}")


if __name__ == "__main__":
    main()
