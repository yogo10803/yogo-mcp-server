import os
from notion_client import Client
from dotenv import load_dotenv

# Load environment early so Notion client has creds.
load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
DATABASE_ID = os.getenv("NOTION_DATABASE_ID")

notion = Client(auth=NOTION_TOKEN)


def add_log(date, content, hours, category):
    return notion.pages.create(
        parent={"database_id": DATABASE_ID},
        properties={
            "Content": {"title": [{"text": {"content": content}}]},
            "Date": {"date": {"start": date}},
            "Hours": {"number": hours},
            "Category": {"multi_select": [{"name": category}] if category else []},
        },
    )


def list_logs(start_date, end_date):
    resp = notion.databases.query(
        **{
            "database_id": DATABASE_ID,
            "filter": {
                "and": [
                    {"property": "Date", "date": {"on_or_after": start_date}},
                    {"property": "Date", "date": {"on_or_before": end_date}},
                ]
            },
            "sorts": [{"property": "Date", "direction": "ascending"}],
        }
    )
    return resp.get("results", [])


def summarize_logs(start_date, end_date):
    logs = list_logs(start_date, end_date)

    summary = {}
    total_hours = 0.0

    for row in logs:
        props = row["properties"]
        content = props["Content"]["title"][0]["text"]["content"]
        hours = props["Hours"]["number"] or 0
        category = (
            props["Category"]["multi_select"][0]["name"]
            if props["Category"]["multi_select"]
            else "Uncategorized"
        )

        total_hours += hours

        if category not in summary:
            summary[category] = []
        summary[category].append({"content": content, "hours": hours})

    return {"total_hours": total_hours, "categories": summary}
