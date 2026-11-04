"""Karrot free-items scanner (Toronto)."""
import re

import requests

import config
import scanner

URL = "https://www.karrotmarket.com/ca/buy-sell/all/"
PARAMS = {
    "h3_index": "617760317938860031",  # Toronto area
    "price": "0__0",                   # free only
    "_data": "routes/($lang).buy-sell.all",
}


def fetch():
    r = requests.get(URL, params=PARAMS, timeout=30,
                     headers={"User-Agent": config.USER_AGENT})
    r.raise_for_status()
    return r.json().get("articles", [])


def parse(articles):
    items = []
    for a in articles:
        if a.get("listingType") != "free" or a.get("status") != "ongoing":
            continue
        m = re.search(r"([\d.]+)\s*km", a.get("relativeDistanceDescription") or "")
        it = {
            "id": "karrot:" + str(a["id"]),
            "source": "karrot",
            "title": (a.get("title") or "").strip(),
            "description": "",
            "url": f"https://www.karrotmarket.com/ca/buy-sell/{a['nodeId']}/",
            "image": a.get("thumbnail"),
            "location": a.get("displayLocationName") or "",
            "lat": None, "lon": None, "posted": None,
            "is_ad": False, "is_dealer": False,
        }
        if m:
            it["km"] = float(m.group(1))
        items.append(it)
    return items


def scan():
    seen = scanner.load_seen()
    first_run = not any(s.startswith("karrot:") for s in seen)
    try:
        items = parse(fetch())
        print(f"[karrot] got {len(items)} listings")
    except Exception as e:
        print(f"[karrot] FAILED: {e}")
        return []
    found = []
    for it in items:
        if it["id"] in seen:
            continue
        seen.add(it["id"])
        reason = scanner.skip_reason(it)
        if not reason and it.get("km", 0) > config.MAX_KM:
            reason = f"too far ({it['km']:.0f} km)"
        if reason:
            print(f"  skip  {it['title'][:50]!r} ({reason})")
        else:
            found.append(it)
    scanner.save_seen(seen)
    if first_run:
        print("[karrot] first run: remembered current listings, no alerts.")
        return []
    return found
