"""Step 2: free-item scanner (Bot 1).

Reads Kijiji + Craigslist free sections, filters junk, and returns only
NEW listings it hasn't seen before. Steps 3-4 (AI value check + Telegram
alerts) plug into `run()` later.
"""
import json
import math
import os
import re
from datetime import datetime, timezone

import config
from sources import fetch, parse_kijiji, parse_craigslist

PHONE_RE = re.compile(r"\d{3}[\s.-]?\d{3}[\s.-]?\d{4}")
# "$20", "20$", "20 dollars", "20 bucks" — but not "$0"
MONEY_RE = re.compile(
    r"\$\s*[1-9]\d*|\b[1-9]\d*\s*\$|\b[1-9]\d*\s*(dollars|bucks|cad)\b", re.I
)


# ---------- filtering ----------

def km_between(lat1, lon1, lat2, lon2):
    r = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def skip_reason(item, now=None):
    now = now or datetime.now(timezone.utc)
    text = (item["title"] + " " + item["description"]).lower()

    if item["is_ad"]:
        return "paid ad"
    if item["is_dealer"]:
        return "business"
    if PHONE_RE.search(item["title"]):
        return "phone number in title (usually a service)"
    for w in config.BLOCKED_WORDS:
        if re.search(r"\b" + re.escape(w) + r"\b", text):
            return f"blocked word: {w}"
    if MONEY_RE.search(text):
        return "not really free (mentions a price)"
    for w in config.NOT_REALLY_FREE_WORDS:
        if re.search(r"\b" + re.escape(w) + r"\b", text):
            return f"not really free: {w}"
    if item["lat"] is not None and item["lon"] is not None:
        km = km_between(config.HOME_LAT, config.HOME_LON, item["lat"], item["lon"])
        item["km"] = round(km, 1)
        if km > config.MAX_KM:
            return f"too far ({km:.0f} km)"
    if item["posted"]:
        posted = datetime.fromisoformat(item["posted"].replace("Z", "+00:00"))
        if (now - posted).total_seconds() > config.MAX_AGE_HOURS * 3600:
            return "too old"
    return None


# ---------- memory ----------

def load_seen(path=config.SEEN_FILE):
    if os.path.exists(path):
        with open(path) as f:
            return set(json.load(f))
    return set()


def save_seen(seen, path=config.SEEN_FILE):
    with open(path, "w") as f:
        json.dump(sorted(seen)[-5000:], f)  # cap so the file stays small


# ---------- main ----------

def scan():
    """Return new, filtered listings from all sources."""
    seen = load_seen()
    first_run = not seen
    found = []

    sources = [
        ("kijiji", config.KIJIJI_URL, parse_kijiji),
        ("craigslist", config.CRAIGSLIST_URL, parse_craigslist),
    ]
    for name, url, parser in sources:
        try:
            items = parser(fetch(url))
            print(f"[{name}] got {len(items)} listings")
        except Exception as e:  # one site failing shouldn't kill the other
            print(f"[{name}] FAILED: {e}")
            continue

        for item in items:
            if item["id"] in seen:
                continue
            seen.add(item["id"])
            reason = skip_reason(item)
            if reason:
                print(f"  skip  {item['title'][:50]!r} ({reason})")
            else:
                found.append(item)

    save_seen(seen)
    if first_run:
        # First run just learns what's already up, so you don't get 80 old alerts.
        print(f"First run: remembered {len(seen)} listings, no alerts sent.")
        return []
    return found


def run():
    new_items = scan()
    print(f"\n{len(new_items)} new item(s) passed filters:")
    for it in new_items:
        dist = f" · {it['km']} km" if "km" in it else ""
        print(f"  NEW [{it['source']}] {it['title']} — {it['location']}{dist}\n      {it['url']}")
    # Step 3 (AI value check) and Step 4 (Telegram alert) will go here.
    return new_items


if __name__ == "__main__":
    run()
