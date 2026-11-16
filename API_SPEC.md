# TokenTrail API (http://127.0.0.1:8000)

Modes: rules | session_reuse | combined | scored | scored_mfa (default)
Seeds: 1 to 10 (generate with python signins.py <seed>)

GET /summary?seed=1&mode=scored_mfa
-> {seed, mode, user_count, app_count, signin_count, alert_count, users_with_alerts}

GET /apps
-> {apps: [{id, name, publisher_verified, first_party, scopes, high_risk_scopes, risk_flags, risky}]}

GET /users?seed=1&mode=scored_mfa
-> {users: [{id, name, role, home_country, privileged, alert_count}]}

GET /users/{user_id}?seed=1&mode=scored_mfa
-> {user, baseline: {countries, asns, devices},
    signins: [{timestamp, day, user, app, ip, country, asn, device_id, session_id, auth_method, result}],
    alerts: [same fields as signins + reasons: [string] + score (scored modes only)]}

GET /alerts?seed=1&mode=scored_mfa
-> {seed, mode, alerts: [same shape as user alerts]}