Yogo MCP Server — Attendance (簡潔說明)

本 repo 含一支 Playwright 腳本，用來自動登入公司 EIP（Azure AD + MFA），點選「打卡」開啟 punch 頁面，並解析今天/近期的打卡紀錄成結構化 JSON。

快速上手（新電腦從零開始）

1) 取得程式碼

	git clone https://github.com/yogo10803/yogo-mcp-server.git
	cd yogo-mcp-server

2) 安裝依賴

	確認 Node.js（建議 v18+），然後：

	npm install
	npx playwright install   # 第一次使用 Playwright 時需要

3) 設定環境變數

	在專案根目錄建立一個 `.env`，至少包含（示例名稱）：

	ATTENDANCE_URL=https://eip.systex.com/UOF/
	ATTENDANCE_USERNAME=your-username@example.com
	ATTENDANCE_PASSWORD=your-password
	ATTENDANCE_HEADFUL=true            # 建議 true，以便完成 MFA
	ATTENDANCE_MFA_TIMEOUT_MS=120000   # 等待 MFA 的毫秒數
	ATTENDANCE_CLICK_CHECKIN=true      # 必須為 true（腳本透過點按打卡按鈕開啟 punch popup）

	注意：公司 MFA 需要互動登入（headful）。若要無人值守運行，需額外建立可程式化的認證（非本說明範圍）。

4) 執行

	npm run attendance

	腳本會：
	- 開啟 EIP，點選 Azure AD 登入
	- 填入帳號/密碼，等待並允許你在瀏覽器完成 MFA
	- 在登入後的首頁點選「打卡」按鈕，打開 punch.systex.com 的 popup
	- 解析 punch 頁面上的打卡紀錄，輸出 `attendance-output.json`

目前功能（簡要）

- 登入：支援 Azure AD/OpenID SSO（含互動式 MFA）。
- 打卡頁面：透過點擊首頁的打卡按鈕打開 punch popup（不會執行最終確認打卡）。
- 解析：將 punch 頁面上的日期/上下班時間/地點等解析成結構化 JSON，輸出到 `attendance-output.json`。

輸出與位置

- 結果會以結構化 JSON 印在終端機上（STDOUT）。

注意事項與除錯

- 若腳本在等待 MFA 時超時，可調整 `ATTENDANCE_MFA_TIMEOUT_MS` 或手動完成驗證。
- 不要嘗試硬編 punch URL（其中的 hash 為伺服器端動態產生）；腳本會點按以取得正確的 popup。
- 若需要完全無人值守，請聯絡資訊安全/系統管理提供可程式化的機器帳號或 API。

簡短範例：

	# clone、安裝、執行（Mac / Linux / zsh）
	git clone https://github.com/yogo10803/yogo-mcp-server.git
	cd yogo-mcp-server
	npm install
	npx playwright install
	# 建立 .env 並填入必要變數
	npm run attendance

License

MIT License © 2025 Yogo MCP Server