from notion_service import add_log


def handle_log_add(params):
    date = params.get("date")
    content = params.get("content")
    hours = params.get("hours")
    category = params.get("category", None)

    if not date or not content or hours is None:
        return {"error": "Missing required fields"}

    page = add_log(date, content, hours, category)
    return {"status": "success", "page_id": page["id"]}
