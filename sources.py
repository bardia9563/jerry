"""Fetch + read listings from Kijiji and Craigslist."""
import html
import json
import re

import requests

import config


# ---------- fetching ----------

def fetch(url):
    r = requests.get(url, headers={"User-Agent": config.USER_AGENT}, timeout=30)
    r.raise_for_status()
    return r.text


# ---------- Kijiji ----------

def parse_kijiji(page_html):
    m = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        page_html, re.S,
    )
    if not m:
        raise ValueError("Kijiji page format changed (no __NEXT_DATA__)")
    state = json.loads(m.group(1))["props"]["pageProps"]["__APOLLO_STATE__"]

    items = []
    for key, x in state.items():
        if not key.startswith("StandardListing:"):
            continue
        attrs = {
            a.get("canonicalName"): a.get("canonicalValues") or []
            for a in (x.get("attributes") or {}).get("all", [])
        }
        loc = x.get("location") or {}
        coords = loc.get("coordinates") or {}
        items.append({
            "id": "kijiji:" + str(x["id"]),
            "source": "kijiji",
            "title": (x.get("title") or "").strip(),
            "description": (x.get("description") or "").strip(),
            "url": x.get("url"),
            "image": (x.get("imageUrls") or [None])[0],
            "location": loc.get("name") or "",
            "lat": coords.get("latitude"),
            "lon": coords.get("longitude"),
            "posted": x.get("activationDate"),
            "is_ad": x.get("adSource") == "TOP_AD",
            "is_dealer": "delr" in attrs.get("forsaleby", []),
        })
    return items


# ---------- Craigslist ----------

CL_ITEM_RE = re.compile(
    r'<li class="cl-static-search-result" title="([^"]*)">\s*'
    r'<a href="([^"]+)">.*?<div class="location">\s*(.*?)\s*</div>',
    re.S,
)


def parse_craigslist(page_html):
    items = []
    for title, url, location in CL_ITEM_RE.findall(page_html):
        items.append({
            "id": "craigslist:" + url.rstrip("/").split("/")[-1],
            "source": "craigslist",
            "title": html.unescape(title).strip(),
            "description": "",
            "url": url,
            "image": None,
            "location": html.unescape(location).strip(),
            "lat": None,
            "lon": None,
            "posted": None,  # list is newest-first; seen.json handles repeats
            "is_ad": False,
            "is_dealer": False,
        })
    return items
