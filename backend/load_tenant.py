import json
from pathlib import Path

TENANT_FILE = Path(__file__).parent / "tenant.json"


def load_tenant():
    with open(TENANT_FILE, encoding="utf-8") as f:
        return json.load(f)


def app_risk(app, high_risk_scopes):
    """Return the high-risk scopes an app requests, plus simple risk flags."""
    risky = [s for s in app["scopes"] if s in high_risk_scopes]
    flags = []
    if not app["publisher_verified"]:
        flags.append("unverified publisher")
    if not app["first_party"] and risky:
        flags.append("third-party app requesting high-risk scopes")
    if "offline_access" in app["scopes"] and not app["first_party"]:
        flags.append("third-party persistent access (refresh token)")
    return risky, flags


if __name__ == "__main__":
    t = load_tenant()
    print(f"Users: {len(t['users'])}  (privileged: {sum(u['privileged'] for u in t['users'])})")
    print(f"Apps:  {len(t['apps'])}\n")
    for app in t["apps"]:
        risky, flags = app_risk(app, t["high_risk_scopes"])
        status = "RISKY" if flags else "ok"
        print(f"{status:6} {app['name']:20} high-risk scopes: {risky or '-'}")
        for f in flags:
            print(f"         - {f}")