import csv
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

from load_tenant import load_tenant

SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 42
random.seed(SEED)
OUT_FILE = Path(__file__).parent / f"signins_{SEED}.csv"
START = datetime(2026, 11, 1)
DAYS = 14

# Each country maps to a few realistic IP prefixes and network operators (ASNs)
NETWORKS = {
    "AE": [("94.200.", "AS5384 Emirates Telecom"), ("2.50.", "AS15802 du")],
    "GB": [("81.2.", "AS2856 British Telecom")],
    "SG": [("118.200.", "AS9506 Singtel")],
}
FIRST_PARTY_APPS = ["app_mail", "app_files"]

ATTACKER_NETWORKS = [
    ("45.142.", "AS208091 Bulletproof-Host", "NL"),   # obvious: foreign hosting provider
    ("185.220.", "AS4224 Tor Exit", "DE"),
]


def user_profile(user):
    """Each user gets a stable home network and one or two devices."""
    prefix, asn = random.choice(NETWORKS[user["home_country"]])
    return {
        "ip": prefix + f"{random.randint(1, 254)}.{random.randint(1, 254)}",
        "asn": asn,
        "devices": [f"dev_{user['id']}_{i}" for i in range(random.randint(1, 2))],
    }


def generate_normal_signins(tenant):
    rows = []
    profiles = {u["id"]: user_profile(u) for u in tenant["users"]}
    live_session = {}  # device -> (session_id, day it was issued)
    for day in range(DAYS):
        date = START + timedelta(days=day)
        if date.weekday() >= 5:  # light weekend activity
            n_range = (0, 2)
        else:
            n_range = (3, 8)
        for user in tenant["users"]:
            p = profiles[user["id"]]
            # Pick the day's sign-in times first, in order, so sessions are issued chronologically
            times = sorted(
                date + timedelta(hours=random.randint(8, 18), minutes=random.randint(0, 59))
                for _ in range(random.randint(*n_range))
            )
            for ts in times:
                device = random.choice(p["devices"])

                # "Stay signed in": keep the session alive for up to 3 days, else issue a new one
                sid, issued = live_session.get(device, (None, -99))
                if sid is None or day - issued > 3 or random.random() < 0.3:
                    sid, issued = f"s_{device}_{day}_{random.randint(1000, 9999)}", day
                    live_session[device] = (sid, issued)

                # Occasionally the same session shows up from a second IP on the user's ISP
                ip = p["ip"]
                if random.random() < 0.15:
                    ip = ip.rsplit(".", 1)[0] + f".{random.randint(1, 254)}"

                rows.append({
                    "timestamp": ts.isoformat(),
                    "day": day,
                    "user": user["id"],
                    "app": random.choice(FIRST_PARTY_APPS),
                    "ip": ip,
                    "country": user["home_country"],
                    "asn": p["asn"],
                    "device_id": device,
                    "session_id": sid,
                    "auth_method": "password+mfa",
                    "result": "success",
                    "label": "normal",
                })
    return sorted(rows, key=lambda r: r["timestamp"])


def generate_attacks(tenant, normal_rows):
    attacks = []
    victims = random.sample([u["id"] for u in tenant["users"]], 3)

    for victim in victims:
        # Reuse one of the victim's real session ids, as a stolen token would
        their_sessions = [r for r in normal_rows if r["user"] == victim and r["day"] < 10]
        stolen = random.choice(their_sessions)
        day = random.randint(10, 13)
        ts = START + timedelta(days=day, hours=random.randint(0, 23), minutes=random.randint(0, 59))

        # 1. Illicit consent: victim grants the malicious app access.
        #    The token is issued to the app's client, not the victim's browser session.
        attacks.append({**stolen, "timestamp": ts.isoformat(), "day": day,
                        "app": "app_pdf_tools", "session_id": f"s_consent_{victim}",
                        "device_id": "client_app_pdf_tools",
                        "label": "illicit_consent"})

        # 2. Obvious token replay: stolen session used from attacker infrastructure, no MFA
        prefix, asn, country = random.choice(ATTACKER_NETWORKS)
        attacks.append({**stolen, "timestamp": (ts + timedelta(hours=2)).isoformat(), "day": day,
                        "ip": prefix + f"{random.randint(1, 254)}.{random.randint(1, 254)}",
                        "asn": asn, "country": country, "device_id": "unknown",
                        "auth_method": "token", "label": "token_replay"})

        # 3. Stealth token replay: victim's own country, ISP, device and auth method.
        #    Only the IP and the reused old session differ.
        stealth_ts = START + timedelta(days=day, hours=random.randint(9, 17))
        attacks.append({**stolen, "timestamp": stealth_ts.isoformat(), "day": day,
                        "ip": stolen["ip"].rsplit(".", 1)[0] + f".{random.randint(1, 254)}",
                        "label": "stealth_replay"})
    return attacks


def add_normal_noise(normal_rows):
    """Legitimate but unusual behaviour that a naive detector will flag."""
    noise = []
    templates = [r for r in normal_rows if r["day"] >= 10]
    for _ in range(6):
        base = random.choice(templates)
        kind = random.choice(["travel", "new_phone", "mobile_data", "travel_new_phone"])
        row = {**base, "label": "normal"}
        if kind == "travel":
            row.update(country="GB", asn="AS2856 British Telecom",
                       ip=f"81.2.{random.randint(1, 254)}.{random.randint(1, 254)}")
        elif kind == "new_phone":
            row["device_id"] = f"dev_{base['user']}_new"
            row["session_id"] = f"s_{row['device_id']}_{base['day']}"
        elif kind == "mobile_data":
            row.update(asn="AS15802 du", ip=f"5.195.{random.randint(1, 254)}.{random.randint(1, 254)}")
        else:  # travel_new_phone: two weak signals at once, still innocent
            row.update(country="GB", asn="AS2856 British Telecom",
                       ip=f"81.2.{random.randint(1, 254)}.{random.randint(1, 254)}",
                       device_id=f"dev_{base['user']}_new")
            row["session_id"] = f"s_{row['device_id']}_{base['day']}"
        noise.append(row)
    return noise


if __name__ == "__main__":
    tenant = load_tenant()
    normal = generate_normal_signins(tenant)
    noise = add_normal_noise(normal)
    rows = sorted(normal + noise + generate_attacks(tenant, normal), key=lambda r: r["timestamp"])
    with open(OUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    attacks = len(rows) - len(normal) - len(noise)
    print(f"Wrote {len(rows)} sign-ins ({attacks} attacks, {len(noise)} noisy normal) to {OUT_FILE.name}")