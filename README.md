# Yogo MCP Server

一個整合多個 MCP (Model Context Protocol) 伺服器的專案，讓 Claude AI 助手可以使用各種強大的工具。此外，還包含一個自動打卡的 Playwright 腳本。

---

## 📖 什麼是這個專案？（白話文說明）

這個專案主要做兩件事：

### 1️⃣ **MCP Servers 整合器**
- 把多個好用的 MCP 工具整合在一起
- 可以一次啟動所有工具，讓 Claude Desktop 使用
- 包含的工具：瀏覽器自動化、維基百科深度搜尋、程式碼文件查詢等

### 2️⃣ **自動打卡腳本**
- 自動登入公司 EIP 系統（支援 Azure AD + MFA 多重驗證）
- 自動解析打卡記錄
- 輸出結構化的 JSON 資料

---

## 🚀 快速開始

### 系統需求
- Node.js 18 或以上版本
- npm 套件管理工具

### 安裝步驟

#### 1) 下載專案

```bash
git clone https://github.com/yogo10803/yogo-mcp-server.git
cd yogo-mcp-server
```

#### 2) 安裝依賴套件

```bash
npm install
npx playwright install   # 第一次使用 Playwright 時需要
```

#### 3) 設定環境變數（選擇性）

複製 `.env.example` 成 `.env`，然後填入你需要的設定：

```bash
cp .env.example .env
```

編輯 `.env` 檔案：

```env
# GitHub Token（如果要使用 GitHub MCP server）
GITHUB_TOKEN=你的_GitHub_Token

# Playwright API Key（如果有的話）
PLAYWRIGHT_API_KEY=你的_API_Key

# Context7 設定
DEFAULT_MINIMUM_TOKENS=50

# 打卡系統設定（如果需要使用打卡功能）
ATTENDANCE_URL=https://eip.systex.com/UOF/
ATTENDANCE_USERNAME=你的帳號@example.com
ATTENDANCE_PASSWORD=你的密碼
ATTENDANCE_HEADFUL=true              # true = 顯示瀏覽器視窗
ATTENDANCE_MFA_TIMEOUT_MS=120000     # 等待 MFA 驗證的時間（毫秒）
```

---

## 📦 功能一：MCP Servers 整合

### 包含哪些工具？

這個專案整合了以下 MCP servers（都定義在 `mcp_config.json`）：

| 工具名稱 | 功能說明 | 類型 |
|---------|---------|------|
| **Playwright** | 瀏覽器自動化（點擊、填表、截圖等） | stdio |
| **Puppeteer** | 另一個瀏覽器自動化工具 | stdio |
| **Context7** | 查詢程式庫的官方文件 | stdio |
| **DeepWiki** | 深度搜尋維基百科 | stdio |
| **Sequential Thinking** | 循序思考工具 | stdio |
| **GitHub** | GitHub Copilot MCP（需要 Token） | http |

### 如何啟動所有 MCP Servers？

有兩種啟動方式：

#### 方式一：前景執行（推薦測試用）

```bash
npm run start:all
```

這會在終端機中顯示所有 server 的輸出，方便除錯。

#### 方式二：背景執行（適合長時間運行）

```bash
node start-all.cjs --background
```

這會：
- 所有 servers 在背景執行
- 輸出日誌到 `logs/` 目錄
- 把 process ID 存到 `.pids/` 目錄

**停止背景 servers：**

```bash
# 停止所有 servers
kill $(cat .pids/*.pid)

# 或停止單一 server
kill $(cat .pids/playwright.pid)
```

**查看日誌：**

```bash
# 查看 Playwright 的日誌
tail -f logs/playwright.log

# 查看所有日誌
ls logs/
```

### 如何在 Claude Desktop 中使用？

#### 步驟 1：找到 Claude Desktop 設定檔

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

#### 步驟 2：編輯設定檔

打開設定檔，把這個專案的 servers 加進去：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "deepwiki": {
      "command": "npx",
      "args": ["-y", "mcp-deepwiki@latest"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

#### 步驟 3：重啟 Claude Desktop

重新啟動 Claude Desktop，你就可以在對話中使用這些工具了！

#### 使用範例

跟 Claude 說：

```
請幫我用 Playwright 打開 Google 首頁並截圖
```

或者：

```
請用 DeepWiki 搜尋「人工智慧」的相關資料
```

或者：

```
請查詢 React 的官方文件（使用 Context7）
```

### 自訂 MCP 設定

如果你想新增或修改 MCP servers，編輯 `mcp_config.json`：

```json
{
  "servers": {
    "你的server名稱": {
      "command": "npx",
      "args": ["套件名稱"],
      "type": "stdio",
      "alwaysAllow": [
        "允許的工具名稱"
      ]
    }
  }
}
```

---

## 🕐 功能二：自動打卡腳本

### 這個腳本做什麼？

自動化處理公司 EIP 打卡流程：

1. 開啟瀏覽器，前往 EIP 登入頁面
2. 點選 Azure AD 登入
3. 自動填入帳號密碼
4. 等待你完成 MFA 多重驗證（會彈出手機通知）
5. 登入後，點擊「打卡」按鈕
6. 解析打卡頁面的記錄
7. 輸出結構化的 JSON 資料到終端機

**注意**：腳本**不會**真的幫你按下「確認打卡」按鈕，只是查詢和解析打卡記錄。

### 如何使用打卡功能？

#### 1) 設定環境變數

確保 `.env` 檔案中有這些設定：

```env
ATTENDANCE_URL=https://eip.systex.com/UOF/
ATTENDANCE_USERNAME=你的帳號@example.com
ATTENDANCE_PASSWORD=你的密碼
ATTENDANCE_HEADFUL=true
ATTENDANCE_MFA_TIMEOUT_MS=120000
```

#### 2) 執行打卡腳本

```bash
npm run attendance
```

#### 3) 完成 MFA 驗證

腳本會：
- 自動開啟瀏覽器
- 填入帳號密碼
- 暫停，等待你在手機上完成 MFA 驗證
- 看到瀏覽器登入成功後，按 Enter 繼續

#### 4) 查看結果

打卡記錄會以 JSON 格式輸出到終端機：

```json
[
  {
    "date": "2025-01-15",
    "start": "09:00",
    "end": "18:00",
    "location": "北區_復北B300辦公室",
    "source": "punch-page"
  },
  {
    "date": "2025-01-14",
    "start": "09:15",
    "end": "18:30",
    "location": "北區_復北B300辦公室",
    "source": "punch-page"
  }
]
```

### 常見問題

**Q: MFA 超時怎麼辦？**
A: 調整 `.env` 中的 `ATTENDANCE_MFA_TIMEOUT_MS`，例如改成 300000（5 分鐘）

**Q: 可以完全自動化嗎（不需要手動 MFA）？**
A: 不行，公司的安全政策需要互動式 MFA。如果需要無人值守運行，需要聯絡 IT 部門提供機器帳號或 API。

**Q: 腳本會幫我打卡嗎？**
A: 不會，腳本只會「查詢」打卡記錄，不會執行實際的打卡動作。

**Q: 為什麼要用 `ATTENDANCE_HEADFUL=true`？**
A: 因為需要看到瀏覽器來完成 MFA 驗證。如果改成 `false`（無頭模式），你看不到瀏覽器，無法完成 MFA。

---

## 📁 專案結構

```
yogo-mcp-server/
├── scripts/
│   ├── attendance.js        # 打卡自動化腳本
│   └── .gitkeep
├── logs/                    # 背景執行時的日誌檔案
├── .pids/                   # 背景執行時的 process ID
├── mcp_config.json          # MCP servers 設定檔
├── start-all.cjs            # 啟動所有 MCP servers 的腳本
├── package.json             # 專案依賴和腳本定義
├── .env.example             # 環境變數範例
├── .gitignore              # Git 忽略清單
└── README.md               # 你正在看的這個檔案
```

---

## 🛠️ 可用的 npm 指令

```bash
# 啟動 Playwright MCP server（單獨）
npm run start:playwright

# 啟動所有 MCP servers（前景）
npm run start:all

# 執行打卡腳本
npm run attendance
```

---

## 🧩 進階使用

### 只啟動特定的 MCP servers

如果你不需要全部的 servers，可以：

1. 編輯 `mcp_config.json`，移除不需要的 servers
2. 或者，直接用 `npx` 單獨啟動：

```bash
# 只啟動 Playwright
npx @playwright/mcp@latest

# 只啟動 DeepWiki
npx -y mcp-deepwiki@latest
```

### 新增自己的 MCP server

1. 在 `mcp_config.json` 中加入你的 server：

```json
{
  "servers": {
    "my-custom-server": {
      "command": "node",
      "args": ["path/to/your/server.js"],
      "type": "stdio",
      "alwaysAllow": ["tool1", "tool2"]
    }
  }
}
```

2. 重新執行 `npm run start:all`

---

## 🐛 除錯技巧

### MCP Servers 無法啟動

```bash
# 確認 node_modules 已安裝
npm install

# 單獨測試某個 server
npx @playwright/mcp@latest
```

### 打卡腳本卡住

1. 確認 `.env` 設定正確
2. 使用 `ATTENDANCE_HEADFUL=true` 看到瀏覽器畫面
3. 手動完成 MFA 後按 Enter
4. 檢查終端機的錯誤訊息

### 查看背景執行的 servers

```bash
# 列出所有執行中的 servers
ls .pids/

# 查看某個 server 的 PID
cat .pids/playwright.pid

# 查看 server 的日誌
tail -f logs/playwright.log
```

---

## 📚 參考資源

- [MCP 官方文件](https://modelcontextprotocol.io/)
- [Playwright MCP](https://github.com/playwright/playwright-mcp)
- [Claude Desktop 設定指南](https://docs.anthropic.com/claude/docs/model-context-protocol)
- [Playwright 官方文件](https://playwright.dev/)

---

## 📄 授權

MIT License © 2025 Yogo MCP Server

---

## 🙋 常見疑問（白話文版）

**Q: 這個專案到底是什麼？**
A: 簡單說，就是讓 Claude AI 可以「操作瀏覽器」、「搜尋維基百科」、「查程式碼文件」等等。另外還有一個自動查打卡記錄的小工具。

**Q: 我一定要用全部的功能嗎？**
A: 不用！你可以只用 MCP servers，或只用打卡腳本，或兩個都用。

**Q: MCP 跟一般的 API 有什麼不同？**
A: MCP 是專門為 AI 助手設計的協定。透過 MCP，Claude 可以「看到」你提供的工具，並且知道怎麼使用它們。就像是給 Claude 裝了一堆外掛程式。

**Q: 我可以自己寫 MCP server 嗎？**
A: 可以！參考 MCP 官方文件，用 TypeScript 或 Python 都能寫。寫好後加到 `mcp_config.json` 就能用。

**Q: 這個專案安全嗎？**
A:
- 打卡腳本需要你的帳號密碼，所以要小心保管 `.env` 檔案（已加入 `.gitignore`）
- MCP servers 都是跑在你本機，不會把資料傳到外部
- 建議不要把 `.env` 檔案提交到 Git

**Q: 可以在伺服器上跑嗎？**
A: 可以，但打卡功能需要互動式 MFA，所以不適合完全無人值守。MCP servers 則可以在伺服器背景執行。

---

**如果這個專案對你有幫助，歡迎給個 ⭐ Star！**
