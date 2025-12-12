import json
import anyio
from mcp import types
from mcp.server import Server
from mcp.server import stdio
from commands.log_add import handle_log_add
from commands.log_list import handle_log_list
from commands.log_summary import handle_log_summary

server = Server("worklog-mcp")

# Define available tools for ChatGPT/MCP.
TOOLS = [
    types.Tool(
        name="log.add",
        description="新增工時紀錄到 Notion",
        inputSchema={
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "日期，格式 YYYY-MM-DD"},
                "content": {"type": "string", "description": "工作內容"},
                "hours": {"type": "number", "description": "小時數（可含小數）"},
                "category": {"type": "string", "description": "分類，可選"},
            },
            "required": ["date", "content", "hours"],
        },
    ),
    types.Tool(
        name="log.list",
        description="列出一段日期間的工時紀錄",
        inputSchema={
            "type": "object",
            "properties": {
                "start": {"type": "string", "description": "起始日期 YYYY-MM-DD"},
                "end": {"type": "string", "description": "結束日期 YYYY-MM-DD"},
            },
            "required": ["start", "end"],
        },
    ),
    types.Tool(
        name="log.summary",
        description="彙整一段日期間的工時總結",
        inputSchema={
            "type": "object",
            "properties": {
                "start": {"type": "string", "description": "起始日期 YYYY-MM-DD"},
                "end": {"type": "string", "description": "結束日期 YYYY-MM-DD"},
            },
            "required": ["start", "end"],
        },
    ),
]


def _text_response(payload: dict, is_error: bool = False) -> types.CallToolResult:
    text = json.dumps(payload, ensure_ascii=False)
    return types.CallToolResult(
        content=[types.TextContent(type="text", text=text)],
        structuredContent=payload,
        isError=is_error,
    )


@server.list_tools()
async def list_tools():
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "log.add":
        result = handle_log_add(arguments)
        return _text_response(result, is_error=bool(result.get("error")))
    if name == "log.list":
        result = handle_log_list(arguments)
        return _text_response(result, is_error=bool(result.get("error")))
    if name == "log.summary":
        result = handle_log_summary(arguments)
        return _text_response(result, is_error=bool(result.get("error")))

    return _text_response({"error": f"Unknown tool: {name}"}, is_error=True)


async def main():
    async with stdio.stdio_server() as (read_stream, write_stream):
        init_opts = server.create_initialization_options()
        await server.run(read_stream, write_stream, init_opts)


if __name__ == "__main__":
    anyio.run(main)
