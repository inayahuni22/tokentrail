import sys
from collections import Counter

from detector import (detect_rules, detect_scored, detect_session_reuse,
                      load_signins, merge_alerts)
from load_tenant import load_tenant

SEEDS = [int(s) for s in sys.argv[1:]] or [1, 2, 3, 4, 5]
LABELS = ("illicit_consent", "token_replay", "stealth_replay")
tenant = load_tenant()

totals = {name: Counter() for name in ("Rules", "Session reuse", "Combined (any)", "Scored")}

for seed in SEEDS:
    rows = load_signins(seed)
    rules = detect_rules(rows, tenant)
    reuse = detect_session_reuse(rows)
    results = {
        "Rules": rules,
        "Session reuse": reuse,
        "Combined (any)": merge_alerts(rules, reuse),
        "Scored": detect_scored(rows, tenant),
    }
    attacks = Counter(r["label"] for r in rows if r["label"] != "normal")

    for name, alerts in results.items():
        t = totals[name]
        caught = Counter(a["label"] for a in alerts if a["label"] != "normal")
        t["fp"] += sum(1 for a in alerts if a["label"] == "normal")
        for label in LABELS:
            t[f"{label}_caught"] += caught[label]
            t[f"{label}_total"] += attacks[label]

print(f"Seeds {SEEDS}\n")
print(f"{'Detector':15} {'Consent':>9} {'Replay':>9} {'Stealth':>9} {'Recall':>8} {'FP':>5} {'Precision':>10}")
for name, t in totals.items():
    tp = sum(t[f"{l}_caught"] for l in LABELS)
    total = sum(t[f"{l}_total"] for l in LABELS)
    precision = tp / (tp + t["fp"]) if tp + t["fp"] else 0
    cells = [f"{t[f'{l}_caught']}/{t[f'{l}_total']}" for l in LABELS]
    print(f"{name:15} {cells[0]:>9} {cells[1]:>9} {cells[2]:>9} "
          f"{tp / total:>8.1%} {t['fp']:>5} {precision:>10.1%}")