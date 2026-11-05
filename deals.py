"""Bot 2: find underpriced items, alert with profit + a ready resale listing."""
import html
import json
import os
import re
import time

import requests

import notify
import valuer
from deal_sources import kijiji, craigslist, karrot_items
from scanner import PHONE_RE

MIN_PROFIT = 30          # dollars
MIN_MARGIN = 0.25        # DEALS: profit also >= 25% of the buy price
# LOWPROF (bot 3): $30+ profit but under 25% margin, e.g. buy $200 -> sell $230
MIN_PRICE = 5            # skip $1 placeholder prices
BATCH = 40               # listings per AI call
MAX_AI_ITEMS = 200       # safety cap per run
SEEN_FILE = "deals_seen.json"

# No longer used as a filter: the AI now checks every new listing.
WATCH = [
    "ps5", "ps4", "playstation", "xbox", "nintendo", "switch", "steam deck",
    "iphone", "ipad", "macbook", "airpods", "apple watch", "imac",
    "galaxy", "pixel", "gpu", "rtx", "graphics card", "monitor", "gaming pc",
    "laptop", "thinkpad", "dyson", "kitchenaid", "vitamix", "nespresso",
    "lego", "dewalt", "milwaukee", "makita", "ryobi", "bike", "e-bike",
    "ebike", "scooter", "herman miller", "steelcase", "secretlab", "canon",
    "nikon", "sony", "gopro", "dji", "drone", "bose", "sonos", "beats",
    "oculus", "quest", "meta quest", "tv", "projector", "roomba", "camera",
]
SKIP = [
    "wanted", "looking for", "iso", "broken", "for parts", "parts only",
    "not working", "cracked", "wholesale", "repair", "rent", "rental",
    "case only", "box only", "trade only", "we buy", "buying",
]


def _has(words, text):
    return any(re.search(r"\b" + re.escape(w) + r"\b", text) for w in words)


# ---------- AI check ----------

PROMPT = """You help a Toronto reseller find UNDERPRICED used items to buy and resell.
For each listing (asking price in CAD), estimate the realistic price it would
SELL for used on Facebook Marketplace / Kijiji in Toronto. Be conservative.
Only include listings where resale value minus asking price is at least
${min_profit} (any margin is fine, e.g. buy $200 -> sell $230 counts). Skip anything that looks
like a scam, broken, an accessory/box only, a store/dealer ad, or too vague.

For each good deal, also write a resale listing. The seller is in Downtown Toronto:
end the listing description with "Pickup in Downtown Toronto."
Only describe the item itself (brand, model, condition, what is included). Never write
things like "message for more photos", "message for dimensions", "DM for details",
"ask for more info" or any other call to message; no emojis, no hashtags.

Listings:
{items}

Reply with ONLY a JSON array (empty [] if no good deals):
[{{"id": "...", "value": 0, "risk": "low|medium|high", "why": "short reason",
  "listing": {{"title": "...", "price": 0, "description": "2-4 short lines"}}}}]"""


def ai_check(items):
    lines = [json.dumps({"id": i["id"], "title": i["title"], "price": i["price"],
                         "description": (i["description"] or "")[:300]}) for i in items]
    body = {"model": valuer.pick_model(), "max_tokens": 2000,
            "messages": [{"role": "user", "content": PROMPT.format(
                min_profit=MIN_PROFIT,
                items="\n".join(lines))}]}
    for attempt in range(3):                       # retry if the AI is briefly down
        r = requests.post(f"{valuer.API}/messages", headers=valuer._headers(),
                          json=body, timeout=90)
        if r.status_code < 500 and r.status_code != 429:
            break
        time.sleep(5 * (attempt + 1))
    r.raise_for_status()
    text = "".join(b.get("text", "") for b in r.json()["content"])
    m = re.search(r"\[.*\]", text, re.S)
    return json.loads(m.group(0)) if m else []


# ---------- memory ----------

def load_seen():
    if os.path.exists(SEEN_FILE):
        return json.load(open(SEEN_FILE))
    return []


def save_seen(seen):
    json.dump(seen[-20000:], open(SEEN_FILE, "w"))


# ---------- main ----------

def format_deal(it, d, kind="deal"):
    e = html.escape
    head = "💸 <b>DEAL" if kind == "deal" else "🪙 <b>LOWPROF"
    profit = d["value"] - it["price"]
    lst = d.get("listing") or {}
    return (
        f"{head}: {e(it['title'])}</b>\n"
        f"Buy ${it['price']:.0f} → resell ~${d['value']} "
        f"(<b>+${profit:.0f}</b>) · risk: {e(d.get('risk', '?'))}\n"
        f"{e(d.get('why', ''))}\n"
        f"📍 {e(it['location'])} ({it['source']})\n{e(it['url'])}\n\n"
        f"📝 <b>Resale listing</b> (set location: Downtown Toronto):\n<pre>{e(lst.get('title', ''))}\n"
        f"${lst.get('price', d['value'])}\n\n{e(lst.get('description', ''))}</pre>"
    )


def run(chat_id):
    seen = load_seen()
    seen_set = set(seen)
    first_run = not seen
    items = []
    for name, fn in (("kijiji", kijiji), ("craigslist", craigslist),
                     ("karrot", karrot_items)):
        try:
            got = fn()
            print(f"[deals:{name}] got {len(got)} listings")
            items += got
        except Exception as e:
            print(f"[deals:{name}] FAILED: {e}")

    new = []
    for it in items:
        if it["id"] in seen_set:
            continue
        seen.append(it["id"])
        seen_set.add(it["id"])
        text = (it["title"] + " " + it["description"]).lower()
        if (it["price"] >= MIN_PRICE
                and not _has(SKIP, text) and not PHONE_RE.search(it["title"])):
            new.append(it)
    save_seen(seen)

    if first_run:
        print("[deals] first run: remembered current listings, no alerts.")
        return
    print(f"[deals] {len(new)} new listing(s) for the AI to check")
    if not new:
        return

    by_id = {it["id"]: it for it in new}
    deals = []
    todo = new[:MAX_AI_ITEMS]
    for i in range(0, len(todo), BATCH):
        try:
            deals += ai_check(todo[i:i + BATCH])
        except Exception as e:
            print(f"[deals] AI batch failed: {e}")
    for d in deals:
        it = by_id.get(d.get("id"))
        if not it or not d.get("value"):
            continue
        profit = d["value"] - it["price"]
        if profit < MIN_PROFIT:
            continue
        kind = "deal" if profit >= MIN_MARGIN * it["price"] else "lowprof"
        print(f"  {kind.upper()}  ${it['price']:.0f} -> ${d['value']}  {it['title'][:50]}")
        if chat_id:
            notify.send(chat_id, format_deal(it, d, kind))
