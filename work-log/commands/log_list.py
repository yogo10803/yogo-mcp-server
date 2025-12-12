from notion_service import list_logs


def handle_log_list(params):
    start = params.get("start")
    end = params.get("end")

    if not start or not end:
        return {"error": "start & end required"}

    results = list_logs(start, end)

    logs = []
    for r in results:
        p = r["properties"]
        logs.append({
            "date": p["Date"]["date"]["start"],
            "content": p["Content"]["title"][0]["text"]["content"],
            "hours": p["Hours"]["number"],
            "category": (
                p["Category"]["multi_select"][0]["name"]
                if p["Category"]["multi_select"] else None
            )
        })

    return {"logs": logs}
