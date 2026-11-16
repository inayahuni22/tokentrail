from detector import detect_scored, detect_session_reuse, load_signins
from load_tenant import load_tenant

TENANT = load_tenant()


def test_stealth_replays_mostly_caught_by_session_reuse():
    caught = total = 0
    for seed in range(1, 11):
        rows = load_signins(seed)
        alerts = detect_session_reuse(rows)
        total += sum(1 for r in rows if r["label"] == "stealth_replay")
        caught += sum(1 for a in alerts if a["label"] == "stealth_replay")
    assert caught / total >= 0.9


def test_session_reuse_has_no_false_positives():
    for seed in range(1, 11):
        alerts = detect_session_reuse(load_signins(seed))
        assert not [a for a in alerts if a["label"] == "normal"]


def test_mfa_aware_scoring_removes_traveller_false_positives():
    plain_fp = mfa_fp = 0
    for seed in range(1, 11):
        rows = load_signins(seed)
        plain_fp += sum(1 for a in detect_scored(rows, TENANT) if a["label"] == "normal")
        mfa_fp += sum(1 for a in detect_scored(rows, TENANT, mfa_aware=True) if a["label"] == "normal")
    assert plain_fp > 0       # the compound noise is a real test
    assert mfa_fp < plain_fp  # the discount actually helps