from notion_service import summarize_logs


def handle_log_summary(params):
    start = params.get("start")
    end = params.get("end")

    if not start or not end:
        return {"error": "Missing start/end"}

    data = summarize_logs(start, end)
    return data
