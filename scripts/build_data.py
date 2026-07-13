#!/usr/bin/env python3
"""Convert the national legal-plans Excel (2025-12 baseline) into data.js for the static site.

Source: data/raw/national-legal-plans-2025-12.xlsx
Output: data.js (window.PLAN_DATA = {...})

Projection rule: from the last known establishment year, roll forward by the
cycle until 2025, then record every establishment year through 2035.
Plans missing cycle or year are kept in the table but excluded from projections.
"""
import json
import openpyxl
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data/raw/national-legal-plans-2025-12.xlsx"
OUT = ROOT / "data.js"

CHAIR = {1: "대통령", 2: "국무총리", 3: "장관·청장·위원장", 4: "차관·차장",
         5: "국무조정실장", 6: "민간위원장", 7: "기타"}

wb = openpyxl.load_workbook(SRC, read_only=True)
ws = wb["국가법정계획 현황(25.12월 기준)"]

plans = []
for r in ws.iter_rows(min_row=2, values_only=True):
    if r[0] is None:
        continue
    cycle = int(r[6]) if isinstance(r[6], (int, float)) and r[6] else None
    year = int(r[7]) if isinstance(r[7], (int, float)) and r[7] else None
    committees = [c.strip() for c in str(r[10]).split("\n") if c.strip()] if r[10] else []
    proj = []
    if cycle and year:
        e = year
        while e < 2025:
            e += cycle
        while e <= 2035:
            proj.append(e)
            e += cycle
    plans.append({
        "no": int(r[0]),
        "ministry": " · ".join(s.strip() for s in (r[1] or "").split("\n") if s.strip()),
        "dept": (r[2] or "").strip(),
        "law": (r[3] or "").strip(),
        "name": (r[4] or "").strip(),
        "lawYear": int(r[5]) if isinstance(r[5], (int, float)) and r[5] else None,
        "cycle": cycle,
        "year": year,
        "coMinistries": int(r[8]) if isinstance(r[8], (int, float)) else None,
        "committee": committees,
        "chair": CHAIR.get(r[11]) if isinstance(r[11], (int, float)) else None,
        "cabinetReview": r[14] == 1,
        "assemblyReport": r[20] == 1,
        "termAligned": r[21] if r[21] in (0, 1) else None,
        "proj": proj,
    })

# aggregates
proj_years = Counter()
for p in plans:
    for e in p["proj"]:
        proj_years[e] += 1
committee_count = Counter()
for p in plans:
    for c in p["committee"]:
        committee_count[c] += 1
ministry_count = Counter(p["ministry"] for p in plans)
cycle_dist = Counter(p["cycle"] for p in plans if p["cycle"])

meta = {
    "total": len(plans),
    "baseline": "2025-12",
    "termAligned": sum(1 for p in plans if p["termAligned"] == 1),
    "termMisaligned": sum(1 for p in plans if p["termAligned"] == 0),
    "termUnknown": sum(1 for p in plans if p["termAligned"] is None),
    "cycle5": sum(1 for p in plans if p["cycle"] == 5),
    "noCycle": sum(1 for p in plans if not p["cycle"]),
    "noYear": sum(1 for p in plans if not p["year"]),
    "projYears": dict(sorted(proj_years.items())),
    "cycleDist": dict(sorted(cycle_dist.items())),
    "ministries": len(ministry_count),
    "ministryCount": dict(ministry_count.most_common()),
    "committees": len(committee_count),
    "committeeTop": committee_count.most_common(30),
}

OUT.write_text("window.PLAN_DATA = " + json.dumps({"meta": meta, "plans": plans}, ensure_ascii=False) + ";\n", encoding="utf-8")
print(f"OK: {len(plans)} plans -> {OUT} ({OUT.stat().st_size:,} bytes)")
print("projection 2025-2031:", {y: n for y, n in sorted(proj_years.items()) if y <= 2031})
