from collections import Counter

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from detector import (build_baselines, detect_rules, detect_scored,
                      detect_session_reuse, load_signins, merge_alerts)
from load_tenant import app_risk, load_tenant

app = FastAPI(title="TokenTrail API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

TENANT = load_tenant()
MODES = ("rules", "session_reuse", "combined", "scored", "scored_mfa")


def strip(rows):
    """Never send simulator ground-truth labels to the frontend."""
    return [{k: v for k, v in r.items() if k != "label"} for r in rows]


def run_mode(rows, mode):
    if mode == "rules":
        return detect_rules(rows, TENANT)
    if mode == "session_reuse":
        return detect_session_reuse(rows)
    if mode == "combined":
        return merge_alerts(detect_rules(rows, TENANT), detect_session_reuse(rows))
    if mode == "scored":
        return detect_scored(rows, TENANT)
    return detect_scored(rows, TENANT, mfa_aware=True)


def get_rows(seed):
    try:
        return load_signins(seed)
    except FileNotFoundError:
        raise HTTPException(404, f"No data for seed {seed}. Run: python signins.py {seed}")


@app.get("/summary")
def summary(seed: int = 1, mode: str = "scored_mfa"):
    if mode not in MODES:
        raise HTTPException(400, f"mode must be one of {MODES}")
    rows = get_rows(seed)
    alerts = run_mode(rows, mode)
    return {
        "seed": seed,
        "mode": mode,
        "user_count": len(TENANT["users"]),
        "app_count": len(TENANT["apps"]),
        "signin_count": len(rows),
        "alert_count": len(alerts),
        "users_with_alerts": len({a["user"] for a in alerts}),
    }


@app.get("/apps")
def apps():
    result = []
    for a in TENANT["apps"]:
        risky_scopes, flags = app_risk(a, TENANT["high_risk_scopes"])
        if a["first_party"]:
            risky_scopes = []  # first-party apps are trusted, so their scopes aren't flagged
        result.append({**a, "high_risk_scopes": risky_scopes, "risk_flags": flags,
                       "risky": bool(flags)})
    return {"apps": result}

@app.get("/users")
def users(seed: int = 1, mode: str = "scored_mfa"):
    rows = get_rows(seed)
    per_user = Counter(a["user"] for a in run_mode(rows, mode))
    return {"users": [{**u, "alert_count": per_user[u["id"]]} for u in TENANT["users"]]}


@app.get("/users/{user_id}")
def user_detail(user_id: str, seed: int = 1, mode: str = "scored_mfa"):
    user = next((u for u in TENANT["users"] if u["id"] == user_id), None)
    if not user:
        raise HTTPException(404, "Unknown user")
    rows = get_rows(seed)
    base = build_baselines(rows)[user_id]
    signins = [r for r in rows if r["user"] == user_id]
    alerts = [a for a in run_mode(rows, mode) if a["user"] == user_id]
    return {
        "user": user,
        "baseline": {k: sorted(v) for k, v in base.items()},
        "signins": strip(signins),
        "alerts": strip(alerts),
    }


@app.get("/alerts")
def alerts(seed: int = 1, mode: str = "scored_mfa"):
    if mode not in MODES:
        raise HTTPException(400, f"mode must be one of {MODES}")
    rows = get_rows(seed)
    result = sorted(run_mode(rows, mode), key=lambda a: a["timestamp"])
    return {"seed": seed, "mode": mode, "alerts": strip(result)}