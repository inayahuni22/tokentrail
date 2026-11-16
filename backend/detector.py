import csv
import sys
from collections import defaultdict
from pathlib import Path

from load_tenant import app_risk, load_tenant

BASELINE_DAYS = 10
MAX_SESSION_DAYS = 3


def load_signins(seed):
    path = Path(__file__).parent / f"signins_{seed}.csv"
    with open(path, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["day"] = int(r["day"])
    return rows


def build_baselines(rows):
    """What each user normally looks like, learned from baseline days only."""
    base = defaultdict(lambda: {"countries": set(), "asns": set(), "devices": set()})
    for r in rows:
        if r["day"] < BASELINE_DAYS:
            b = base[r["user"]]
            b["countries"].add(r["country"])
            b["asns"].add(r["asn"])
            b["devices"].add(r["device_id"])
    return base


def detect_rules(rows, tenant):
    risky_apps = {a["id"] for a in tenant["apps"]
                  if app_risk(a, tenant["high_risk_scopes"])[1]}
    base = build_baselines(rows)
    alerts = []
    for r in rows:
        if r["day"] < BASELINE_DAYS:
            continue
        b = base[r["user"]]
        reasons = []
        if r["app"] in risky_apps:
            reasons.append("sign-in to high-risk unverified app")
        if r["country"] not in b["countries"]:
            reasons.append(f"new country {r['country']}")
        if r["asn"] not in b["asns"]:
            reasons.append(f"new network {r['asn']}")
        if r["device_id"] not in b["devices"]:
            reasons.append("unknown device")
        if r["auth_method"] == "token":
            reasons.append("token sign-in without interactive MFA")
        if reasons:
            alerts.append({**r, "reasons": reasons})
    return alerts


def detect_session_reuse(rows):
    """Flag a session used after it was superseded on its device, or past its max lifetime."""
    issued = {}          # session_id -> (day issued, device)
    latest_issue = {}    # device -> (day, timestamp, session_id) of the newest session on it
    alerts = []
    for r in sorted(rows, key=lambda x: x["timestamp"]):
        sid, dev = r["session_id"], r["device_id"]
        if sid not in issued:
            issued[sid] = (r["day"], dev)
            latest_issue[dev] = (r["day"], r["timestamp"], sid)
            continue

        issue_day, issue_dev = issued[sid]
        reasons = []
        newest = latest_issue.get(issue_dev)
        if newest and newest[2] != sid:
            reasons.append(f"session reused after device was issued a newer session on day {newest[0]}")
        if r["day"] - issue_day > MAX_SESSION_DAYS:
            reasons.append(f"session used {r['day'] - issue_day} days after issue (max {MAX_SESSION_DAYS})")
        if reasons:
            alerts.append({**r, "reasons": reasons})
    return alerts


def merge_alerts(*alert_lists):
    """One alert per sign-in row, with every reason combined."""
    merged = {}
    for alerts in alert_lists:
        for a in alerts:
            key = (a["timestamp"], a["user"], a["session_id"], a["ip"])
            if key in merged:
                merged[key]["reasons"] += a["reasons"]
            else:
                merged[key] = {**a, "reasons": list(a["reasons"])}
    return list(merged.values())


# How much each signal counts. Strong evidence of theft or abuse = 3, weak anomaly = 1.
WEIGHTS = {
    "sign-in to high-risk unverified app": 3,
    "session reused after device was issued a newer session": 3,
    "session used": 3,                  # past max lifetime
    "new country": 1,
    "new network": 1,
    "unknown device": 1,
    "token sign-in without interactive MFA": 1,
}
STRONG = ("sign-in to high-risk unverified app",
          "session reused after device was issued a newer session",
          "session used")
ALERT_THRESHOLD = 3
MFA_DISCOUNT = 0.5   # weak signals count half when the sign-in passed fresh interactive MFA


def risk_score(reasons, auth_method=None):
    """Sum signal weights. If auth_method is given, weak signals are discounted after fresh MFA."""
    fresh_mfa = auth_method == "password+mfa"
    total = 0
    for reason in reasons:
        for prefix, weight in WEIGHTS.items():
            if reason.startswith(prefix):
                strong = reason.startswith(STRONG)
                total += weight if (strong or not fresh_mfa) else weight * MFA_DISCOUNT
                break
    return total


def detect_scored(rows, tenant, threshold=ALERT_THRESHOLD, mfa_aware=False):
    """Merge both detectors, then alert only when the combined score reaches the threshold."""
    merged = merge_alerts(detect_rules(rows, tenant), detect_session_reuse(rows))
    scored = []
    for a in merged:
        s = risk_score(a["reasons"], a["auth_method"] if mfa_aware else None)
        if s >= threshold:
            scored.append({**a, "score": s})
    return scored


def score(name, alerts, rows):
    attacks = [r for r in rows if r["label"] != "normal"]
    caught = [a for a in alerts if a["label"] != "normal"]
    false_pos = [a for a in alerts if a["label"] == "normal"]
    precision = len(caught) / len(alerts) if alerts else 0
    print(f"{name}: caught {len(caught)}/{len(attacks)}, "
          f"{len(false_pos)} false positives, precision {precision:.0%}")
    for label in ("illicit_consent", "token_replay", "stealth_replay"):
        total = sum(1 for r in attacks if r["label"] == label)
        hit = sum(1 for a in caught if a["label"] == label)
        print(f"    {label:16} {hit}/{total}")


if __name__ == "__main__":
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    tenant = load_tenant()
    rows = load_signins(seed)

    rules = detect_rules(rows, tenant)
    reuse = detect_session_reuse(rows)
    combined = merge_alerts(rules, reuse)

    print(f"Sign-ins: {len(rows)}\n")
    score("Rules only        ", rules, rows)
    score("Session reuse only", reuse, rows)
    score("Combined          ", combined, rows)
    score("Scored            ", detect_scored(rows, tenant), rows)
    score("Scored + MFA      ", detect_scored(rows, tenant, mfa_aware=True), rows)