"""Saves every alert (with map coordinates) to docs/alerts.json for the live map.

Importing this module is enough: it wraps the alert formatters so each
alert that gets sent is also logged.
"""
import json
import os
import time

import requests

import deals
import notify

PATH = "docs/alerts.json"
GEO_CACHE = {}


def geocode(name):
    """Neighbourhood/city name -> (lat, lon) using OpenStreetMap."""
    if not name:
        return None, None
    if name in GEO_CACHE:
        return GEO_CACHE[name]
    try:
        r = requests.get("https://nominatim.openstreetmap.org/search",
                         params={"q": f"{name}, Ontario, Canada",
                                 "format": "json", "limit": 1},
                         headers={"User-Agent": "jerry-alert-map/1.0"},
                         timeout=15)
        hit = (r.json() or [None])[0]
        res = (float(hit["lat"]), float(hit["lon"])) if hit else (None, None)
    except Exception:
        res = (None, None)
    GEO_CACHE[name] = res
    time.sleep(1)  # be polite to the free geocoder
    return res


def log(kind, it, value=None):
    lat, lon = it.get("lat"), it.get("lon")
    if lat is None or lon is None:
        lat, lon = geocode(it.get("location"))
    if lat is None:
        return
    os.makedirs("docs", exist_ok=True)
    data = json.load(open(PATH)) if os.path.exists(PATH) else []
    data.append({
        "t": int(time.time()), "kind": kind, "title": it.get("title", "")[:80],
        "price": it.get("price", 0), "value": value or it.get("value", 0),
        "source": it.get("source", ""), "url": it.get("url", ""),
        "where": it.get("location", ""), "lat": round(lat, 5),
        "lon": round(lon, 5),
    })
    json.dump(data[-300:], open(PATH, "w"))


_free_fmt = notify.format_alert
_deal_fmt = deals.format_deal


def _free(it):
    log("free", it)
    return _free_fmt(it)


def _deal(it, d):
    log("deal", it, d.get("value"))
    return _deal_fmt(it, d)


notify.format_alert = _free
deals.format_deal = _deal
