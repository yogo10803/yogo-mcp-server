# Worklog MCP Server

一個可從 ChatGPT 直接操作、寫入 Notion Database 的「外包工時紀錄系統」。

## Features
- `log.add`：新增工時記錄
- `log.list`：列出一段期間的紀錄
- `log.summary`：彙整週報資料
- ChatGPT 可透過自然語言自動呼叫這些指令

## Usage Examples（在 ChatGPT 直接輸入）

### 新增工時
> 幫我記一筆：2/1 做會員 CRUD 1.2 小時，分類 Feature Development

ChatGPT 會轉成：
{
"method": "log.add",
"params": {
"date": "2025-02-01",
"content": "會員 CRUD",
"hours": 1.2,
"category": "Feature Development"
}
}

yaml
複製程式碼

### 查詢工時
> 幫我列出 2/1–2/7 的所有紀錄

### 產週報
> 幫我整理本週週報

---

## Category 建議
- Bug Related
- Feature Development
- Optimization (optional)
- Documentation

---

## 啟動
- 開發/測試（前景）：`python3 main.py`（在 `work-log` 目錄）
- 背景跑 PM2（推薦）：`PM2_HOME=$(pwd)/.pm2 npx pm2 start ecosystem.config.cjs --update-env`（在 repo 根目錄）

# Running in Background with PM2

## Start

PM2_HOME=$(pwd)/.pm2 npx pm2 start ecosystem.config.cjs --update-env

## Restart

PM2_HOME=$(pwd)/.pm2 npx pm2 restart worklog-mcp

## Stop

PM2_HOME=$(pwd)/.pm2 npx pm2 stop worklog-mcp

## View Logs

PM2_HOME=$(pwd)/.pm2 npx pm2 logs worklog-mcp

## Autostart on system reboot

pm2 startup
PM2_HOME=$(pwd)/.pm2 npx pm2 save
