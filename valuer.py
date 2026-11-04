"""Step 3: AI value check. Asks Claude what each free item resells for."""
import json
import os
import re

import requests

MIN_VALUE = 50  # only alert on items worth at least this (CAD)
API = "https://api.anthropic.com/v1"


def _headers():
    return {
        "x-api-key": os.environ["ANTHROPIC_API_KEY"].strip(),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }


def pick_model():
    """Use the cheapest current Haiku model on the account."""
    r = requests.get(f"{API}/models", headers=_headers(), timeout=30)
    r.raise_for_status()
    ids = [m["id"] for m in r.json().get("data", [])]  # newest first
    for want in ("haiku", "sonnet"):
        for i in ids:
            if want in i:
                return i
    return ids[0]


PROMPT = """You help a Toronto reseller flip FREE items from Kijiji/Craigslist.
For each listing, estimate what it would realistically SELL for used on
Facebook Marketplace / Kijiji in Toronto (CAD), based only on the text.
Be conservative. Junk, broken, vague, or worthless stuff = 0.
Also set "carry" to false if it's bigger than a small couch / TV
(one person can't move it in a small car or on transit).

Listings:
{items}

Reply with ONLY a JSON array, one object per listing:
[{{"id": "...", "value": 0, "carry": true, "why": "short reason"}}]"""


def estimate(items):
    """Adds 'value', 'carry', 'why' to each item. Returns the items."""
    if not items:
        return items
    lines = [
        json.dumps({"id": it["id"], "title": it["title"],
                    "description": it["description"][:400]})
        for it in items
    ]
    body = {
        "model": pick_model(),
        "max_tokens": 1500,
        "messages": [{"role": "user",
                      "content": PROMPT.format(items="\n".join(lines))}],
    }
    r = requests.post(f"{API}/messages", headers=_headers(), json=body, timeout=60)
    r.raise_for_status()
    text = "".join(b.get("text", "") for b in r.json()["content"])
    m = re.search(r"\[.*\]", text, re.S)
    results = {x["id"]: x for x in json.loads(m.group(0))} if m else {}
    for it in items:
        res = results.get(it["id"], {})
        it["value"] = int(res.get("value") or 0)
        it["carry"] = bool(res.get("carry", True))
        it["why"] = res.get("why", "")
    return items


def worth_it(item):
    return item.get("value", 0) >= MIN_VALUE and item.get("carry", True)
