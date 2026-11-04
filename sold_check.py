"""Watches the original listings behind recent DEAL / LOWPROF alerts.

If the original disappears (sold, deleted or expired), Jerry texts you so you
can take your own Marketplace listing down, and the live map marks it SOLD.
"""
import html
import json
import os
import time

import requests

import config
import notify

PATH = "docs/alerts.json"
EVERY = 4 * 60           # re-check each original every scan (about every 5 minutes)
KEEP = 7 * 86400         # only watch alerts from the last 7 days
# Only very specific "dead ad" wording (Craigslist). Kijiji pages contain generic
# phrases even on live ads, so for Kijiji / Karrot only a real 404 / 410 counts.
GONE_WORDS = ["this posting has been deleted", "this posting has expired",
              "this posting has been flagged for removal"]


def is_gone(url):
    """True if the original listing is clearly gone, None if unsure."""
    if url.startswith("/"):
        url = "https://www.kijiji.ca" + url
    try:
        r = requests.get(url, headers={"User-Agent": config.USER_AGENT},
                         timeout=20, allow_redirects=False)
    except Exception:
        return None
    if r.status_code in (404, 410):
        return True
    if r.status_code != 200:
        return None                    # redirects, blocks, errors: don't guess
    if "craigslist.org" in url and any(w in r.text.lower() for w in GONE_WORDS):
        return True
    return False


def run(chat_id):
    if not os.path.exists(PATH):
        return
    data = json.load(open(PATH))
    now, changed, done = time.time(), False, 0
    for a in data:
        if done >= 40:                # keep each scan quick
            break
        if a.get("kind") not in ("deal", "lowprof") or a.get("gone"):
            continue
        if now - a.get("t", 0) > KEEP or not a.get("url"):
            continue
        if now - a.get("checked", 0) < EVERY:
            continue
        a["checked"] = int(now)
        changed, done = True, done + 1
        gone = is_gone(a["url"])
        print(f"[sold?] {'GONE' if gone else 'still up' if gone is False else 'unsure'}  {a['title'][:50]}")
        if gone:                      # must look gone twice in a row before we tell you
            a["miss"] = a.get("miss", 0) + 1
        elif gone is False:
            a.pop("miss", None)
        if gone and a["miss"] >= 2:
            a["gone"] = int(now)
            if chat_id:
                notify.send(chat_id,
                            f"🛑 <b>SOLD / REMOVED:</b> {html.escape(a['title'])}\n"
                            f"The original ({a.get('source', '')}) is gone. "
                            f"Take your Marketplace listing down or mark it sold.")
        time.sleep(1)
    if changed:
        json.dump(data, open(PATH, "w"))
