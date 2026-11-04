"""Step 4: Telegram alerts."""
import html
import os

import requests

CHAT_FILE = "chat_id.txt"


def _api(method, **params):
    token = os.environ["TELEGRAM_BOT_TOKEN"].strip()
    r = requests.post(f"https://api.telegram.org/bot{token}/{method}",
                      json=params, timeout=30)
    r.raise_for_status()
    return r.json()["result"]


def get_chat_id():
    """Use TELEGRAM_CHAT_ID if set, else whoever last messaged the bot."""
    if os.environ.get("TELEGRAM_CHAT_ID", "").strip():
        return os.environ["TELEGRAM_CHAT_ID"].strip(), False
    if os.path.exists(CHAT_FILE):
        return open(CHAT_FILE).read().strip(), False
    for upd in reversed(_api("getUpdates")):
        chat = (upd.get("message") or {}).get("chat") or {}
        if chat.get("type") == "private":
            with open(CHAT_FILE, "w") as f:
                f.write(str(chat["id"]))
            return str(chat["id"]), True
    return None, False


def send(chat_id, text):
    _api("sendMessage", chat_id=chat_id, text=text, parse_mode="HTML",
         disable_web_page_preview=False)


def format_alert(it):
    e = html.escape
    dist = f" · {it['km']} km" if "km" in it else ""
    return (
        f"🆓 <b>{e(it['title'])}</b>\n"
        f"💰 Worth ~${it['value']} — {e(it.get('why', ''))}\n"
        f"📍 {e(it['location'])}{dist} ({it['source']})\n"
        f"{e(it['url'])}"
    )
