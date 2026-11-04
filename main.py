"""Jerry: scan -> AI value check -> Telegram alert."""
import alertlog  # noqa: F401  (logs alerts for the live map)
import deals
import karrot
import scanner
import valuer
import notify


def main():
    chat_id, just_found = notify.get_chat_id()
    if not chat_id:
        print("No Telegram chat yet: send your bot a message ('hi') first.")
    elif just_found:
        notify.send(chat_id, "✅ Jerry is connected! I'll message you when "
                             "I find free stuff worth $50+.")
        print("Telegram connected.")
    try:
        deals.run(chat_id)  # Bot 2
    except Exception as e:
        print(f"[deals] FAILED: {e}")

    items = scanner.scan() + karrot.scan()
    print(f"{len(items)} new item(s) passed filters")
    if not items:
        return

    try:
        valuer.estimate(items)
    except Exception as e:
        print(f"AI value check FAILED: {e}")
        return
    for it in items:
        verdict = "ALERT" if valuer.worth_it(it) else "skip"
        print(f"  {verdict}  ${it['value']:>4}  {it['title'][:50]}  ({it['why']})")
        if verdict == "ALERT" and chat_id:
            notify.send(chat_id, notify.format_alert(it))


if __name__ == "__main__":
    main()
