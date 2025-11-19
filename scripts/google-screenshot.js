// 使用 Playwright 打開示範頁面並截圖
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  console.log('🚀 啟動瀏覽器...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();

  // 設定視窗大小
  await page.setViewportSize({ width: 1280, height: 720 });

  const htmlPath = path.resolve(__dirname, '../demo.html');
  console.log(`📄 開啟示範頁面：${htmlPath}`);

  await page.goto(`file://${htmlPath}`, {
    waitUntil: 'networkidle'
  });

  // 等待頁面完全載入
  await page.waitForTimeout(1000);

  console.log('📸 截圖中...');
  const screenshotPath = path.resolve(__dirname, '../playwright-demo.png');
  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });

  console.log('✅ 截圖完成！');
  console.log(`📁 檔案位置：${screenshotPath}`);

  await browser.close();
})();
