"""Phone notifications from the Jerry home-screen app (Web Push).

Needs two GitHub secrets: VAPID_PRIVATE_KEY (the key Claude gave you) and
PUSH_SUBSCRIPTION (the code the app shows after tapping the bell).
If either is missing, this quietly does nothing and Telegram still works.
"""
import json
import os


def send(title, body, url=""):
    key = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
    sub = os.environ.get("PUSH_SUBSCRIPTION", "").strip()
    if not key or not sub:
        return
    try:
        from pywebpush import webpush
        webpush(subscription_info=json.loads(sub),
                data=json.dumps({"title": title, "body": body, "url": url}),
                vapid_private_key=key,
                vapid_claims={"sub": "mailto:jerry-bot@users.noreply.github.com"},
                ttl=3600, timeout=10)
    except Exception as e:  # never let a notification problem stop the scan
        print(f"[push] failed: {e}")
