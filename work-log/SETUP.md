# Worklog MCP Server - SETUP GUIDE

## 1. Clone 專案
git clone https://github.com/yourname/worklog-mcp.git
cd worklog-mcp

shell
複製程式碼

## 2. 建立虛擬環境（可選，但推薦）
python3 -m venv venv
source venv/bin/activate  # Windows 用 .\\venv\\Scripts\\activate

（作用：把 Python 套件鎖在專案目錄，避免和系統全域套件衝突）

## 3. 安裝 Python 套件
pip3 install -r requirements.txt

## 4. 設定 Notion
1. 建立 Integration → 取得 Integration Token  
2. 建立 Database → 取得 Database ID  
3. 將 Integration 加入 database（Add Connections）

## 5. 設定環境變數
cp .env.example .env

複製程式碼

填入：

NOTION_TOKEN=secret_xxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxx

shell
複製程式碼

## 6. 啟動 MCP Server（用 PM2 背景執行）
在 repo 根目錄：
PM2_HOME=$(pwd)/.pm2 npx pm2 start ecosystem.config.cjs --update-env

檢查狀態 / 看日誌：
PM2_HOME=$(pwd)/.pm2 npx pm2 status
PM2_HOME=$(pwd)/.pm2 npx pm2 logs worklog-mcp --lines 50

（若想直接前景測試，可在 work-log 目錄：`python3 main.py`）

成功後 ChatGPT 會自動偵測到此 MCP 工具。

---

# Connecting ChatGPT to the MCP Server

ChatGPT（Web 或 Desktop）會在本機自動搜尋可用的 MCP 服務。  
啟動 MCP server 後，你需要：

## 1. 在 ChatGPT 設定中啟用 MCP（僅需做一次）
ChatGPT → Settings → MCP → Enable local MCP servers

## 2. 確保 MCP Server 正在執行


pm2 start ecosystem.config.cjs


## 3. 使用支援 MCP 的模型
如：
- GPT-4.1
- GPT-4.1-mini
- GPT-5
- GPT-5.1
（若模型不支援 MCP，工具列表會消失）

## 4. ChatGPT 會自動偵測並載入 worklog-mcp
載入成功後，在任何對話中即可直接說：

- 「幫我記一筆：今天做 CRUD 1.5 小時」
- 「幫我列出 2/1–2/7 的工時」
- 「幫我做本週週報」
