"""Bot 2 sources: priced listings from Kijiji, Craigslist, Karrot."""
import html
import json
import re

import requests

import config
import karrot


# ---------- sources ----------

def kijiji():
    out = []
    for page in ("", "page-2/", "page-3/"):
        url = (f"https://www.kijiji.ca/b-buy-sell/gta-greater-toronto-area/"
               f"{page}c10l1700272?sort=dateDesc")
        page_html = requests.get(url, timeout=30,
                                 headers={"User-Agent": config.USER_AGENT}).text
        m = re.search(r'<script id="__NEXT_DATA__" type="application/json">'
                      r'(.*?)</script>', page_html, re.S)
        if not m:
            continue
        st = json.loads(m.group(1))["props"]["pageProps"]["__APOLLO_STATE__"]
        for k, x in st.items():
            if not k.startswith("StandardListing:") or x.get("adSource") == "TOP_AD":
                continue
            amt = (x.get("price") or {}).get("amount")
            if not amt:
                continue
            out.append({"id": "kijiji:" + str(x["id"]), "source": "kijiji",
                        "title": (x.get("title") or "").strip(),
                        "description": (x.get("description") or "")[:300],
                        "price": amt / 100, "url": x.get("url"),
                        "location": (x.get("location") or {}).get("name", "")})
    return out


CL_RE = re.compile(
    r'<li class="cl-static-search-result" title="([^"]*)">\s*<a href="([^"]+)">'
    r'.*?<div class="price">\$([\d,]+)</div>.*?<div class="location">\s*(.*?)\s*</div>',
    re.S)


def craigslist():
    page_html = requests.get("https://www.craigslist.org/search/area/toronto?cat=sss",
                             timeout=30, headers={"User-Agent": config.USER_AGENT}).text
    return [{"id": "craigslist:" + url.rstrip("/").split("/")[-1],
             "source": "craigslist", "title": html.unescape(t).strip(),
             "description": "", "price": float(p.replace(",", "")),
             "url": url, "location": html.unescape(loc).strip()}
            for t, url, p, loc in CL_RE.findall(page_html)[:120]]


def karrot_items():
    params = dict(karrot.PARAMS)
    params.pop("price")
    r = requests.get(karrot.URL, params=params, timeout=30,
                     headers={"User-Agent": config.USER_AGENT})
    out = []
    for a in r.json().get("articles", []):
        if a.get("listingType") != "sell" or a.get("status") != "ongoing":
            continue
        out.append({"id": "karrot:" + str(a["id"]), "source": "karrot",
                    "title": (a.get("title") or "").strip(), "description": "",
                    "price": float(a.get("price") or 0),
                    "url": f"https://www.karrotmarket.com/ca/buy-sell/{a['nodeId']}/",
                    "location": a.get("displayLocationName") or ""})
    return out
