#!/usr/bin/env node
// scripts/attendance.js
// Playwright script to login to eip.systex.com, handle Azure AD + MFA (interactive),
// find the check-in block on Homepage.aspx, optionally open the punch site and parse attendance entries.

const { chromium } = require('playwright');
require('dotenv').config();
const readline = require('readline');

const url = process.env.ATTENDANCE_URL;
const username = process.env.ATTENDANCE_USERNAME;
const password = process.env.ATTENDANCE_PASSWORD;
const headful = (process.env.ATTENDANCE_HEADFUL || 'true').toLowerCase() === 'true';
const waitForRedirectMs = parseInt(process.env.ATTENDANCE_MFA_TIMEOUT_MS || '600000', 10);

if (!url || !username || !password) {
  console.error('Missing environment variables. Please set ATTENDANCE_URL, ATTENDANCE_USERNAME, ATTENDANCE_PASSWORD');
  process.exit(2);
}

// Parse punch.systex.com page text into structured entries (date ISO, start, end, location)
function parsePunchText(text) {
  const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out = [];
  const year = new Date().getFullYear();
  for (let i = 0; i < lines.length; i++) {
    // match formats like: 10/21 (二) 09:29 ~ 18:29
    const m = lines[i].match(/^(\d{1,2})\/(\d{1,2})\s*(?:\([^)]*\))?\s*(\d{1,2}:\d{2})\s*[~\-–]\s*(\d{1,2}:\d{2})/);
    if (m) {
      const mm = String(m[1]).padStart(2, '0');
      const dd = String(m[2]).padStart(2, '0');
      const date = `${year}-${mm}-${dd}`;
      const start = m[3];
      const end = m[4];
      // next line may be location like "工作地點 : 北區_復北B300辦公室"
      let location = null;
      if (i + 1 < lines.length && /工作地點/.test(lines[i + 1])) {
        const locLine = lines[i + 1].split(/[:：]/).slice(1).join(':').trim();
        location = locLine || lines[i + 1].replace(/工作地點[:：]?/,'').trim();
      }
      out.push({ date, start, end, location, source: 'punch-page' });
    }
  }
  return out;
}

(async () => {
  const browser = await chromium.launch({ headless: !headful });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Opening', url);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // click Azure AD link if present
    const openIdSel = '#hlO365Login, a[href*="OpenIdAuth"], a:has-text("Azure AD")';
    const openId = await page.$(openIdSel);
    if (openId) {
      console.log('Clicking Azure AD login link...');
      await Promise.all([
        page.click(openIdSel).catch(() => {}),
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {})
      ]);
    }

    console.log('Waiting for Microsoft login (username field)...');
    let loginField = null;
    try {
      await Promise.race([
        page.waitForSelector('#i0116', { timeout: 20000 }).then(() => { loginField = '#i0116'; }),
        page.waitForSelector('input[name="loginfmt"]', { timeout: 20000 }).then(() => { loginField = 'input[name="loginfmt"]'; })
      ]);
    } catch (e) {}

    if (loginField) {
      console.log('Filling username into', loginField);
      await page.fill(loginField, username).catch(() => page.evaluate((s, v) => { const el = document.querySelector(s); if (el) el.value = v; }, loginField, username));

      const tryClick = async (sels) => {
        for (const s of sels) {
          try {
            const el = await page.$(s);
            if (!el) continue;
            await el.click().catch(() => page.evaluate(sel => { const e = document.querySelector(sel); if (e) e.click(); }, s));
            return true;
          } catch (e) {}
        }
        return false;
      };

      // Improved submit: ensure the sign-in button is enabled and use multiple strategies to trigger its handler.
      const submitSignIn = async () => {
        const sel = '#idSIButton9';
        try {
          // wait for the button to appear
          await page.waitForSelector(sel, { timeout: 8000 });
        } catch (e) {
          // fallback to generic submit
          return await tryClick(['button[type="submit"]', sel]);
        }

        // Wait until it is enabled/visible (checking disabled attribute / aria-disabled / class state)
        const enabled = await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (!el) return false;
          if (el.disabled) return false;
          const aria = el.getAttribute('aria-disabled'); if (aria === 'true') return false;
          return true;
        }, sel);

        if (!enabled) {
          // try a short retry loop in case the page is still initializing handlers
          for (let i = 0; i < 6; i++) {
            await page.waitForTimeout(300);
            const ok = await page.evaluate((s) => {
              const el = document.querySelector(s);
              if (!el) return false;
              if (el.disabled) return false;
              const aria = el.getAttribute('aria-disabled'); if (aria === 'true') return false;
              return true;
            }, sel);
            if (ok) break;
          }
        }

        // Try native click first
        try {
          const el = await page.$(sel);
          if (el) {
            console.log('Attempting native click on', sel);
            await el.click({ force: true }).catch(() => {});
          }
        } catch (e) {}

        // If navigation or MFA selector didn't appear, try dispatching low-level pointer/mouse events
        try {
          await page.evaluate((s) => {
            const el = document.querySelector(s);
            if (!el) return;
            el.focus();
            const rect = el.getBoundingClientRect();
            const evOpts = { bubbles: true, cancelable: true, view: window };
            el.dispatchEvent(new MouseEvent('pointerdown', Object.assign({}, evOpts, { clientX: rect.left + 1, clientY: rect.top + 1 })));
            el.dispatchEvent(new MouseEvent('pointerup', Object.assign({}, evOpts, { clientX: rect.left + 1, clientY: rect.top + 1 })));
            el.dispatchEvent(new MouseEvent('click', Object.assign({}, evOpts, { clientX: rect.left + 1, clientY: rect.top + 1 })));
          }, sel);
        } catch (e) {}

        // As a last resort, if the page defines the primaryButton_onClick function (MS login), call it directly
        try {
          await page.evaluate(() => {
            if (typeof primaryButton_onClick === 'function') {
              try { primaryButton_onClick(); } catch (e) {}
            }
          });
        } catch (e) {}

        // Fallback generic submit
        return await tryClick(['button[type="submit"]', sel]);
      };

      // After filling username, click Next to reach the password field
      await tryClick(['#idSIButton9', 'button[type="submit"]']);
      // Wait for either navigation or appearance of password field (race)
      try {
        await Promise.race([
          page.waitForSelector('#i0118, input[type="password"], input[name="passwd"]', { timeout: 10000 }),
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 })
        ]);
      } catch (e) {}
      // Ensure password field is available (give it more time if needed)
      console.log('Waiting for password field...');
      await page.waitForSelector('#i0118, input[type="password"], input[name="passwd"]', { timeout: 20000 }).catch(() => {});
      const pwdSel = (await page.$('#i0118')) ? '#i0118' : 'input[type="password"]';
      await page.fill(pwdSel, password).catch(() => page.evaluate((s, v) => { const el = document.querySelector(s); if (el) el.value = v; }, pwdSel, password));
  // Actively submit credentials (robust multi-strategy click)
  await submitSignIn();

      // Wait for either a navigation or an MFA prompt to appear so the flow proceeds automatically
      const submitTimeout = 30000;
      try {
        const navPromise = page.waitForNavigation({ waitUntil: 'networkidle', timeout: submitTimeout }).then(() => 'navigation').catch(() => null);
        const mfaSelectors = [
          'text=Verify your identity',
          'text=Approve sign-in',
          '#idDiv_SAOTCAS',
          'text=Two-step verification',
          'text=Stay signed in',
          'input[name="otc"]'
        ];
        const mfaPromise = (async () => {
          for (const s of mfaSelectors) {
            try {
              await page.waitForSelector(s, { timeout: submitTimeout });
              return 'mfa';
            } catch (e) {}
          }
          return null;
        })();

        const res = await Promise.race([navPromise, mfaPromise]);
        if (res === 'navigation') {
          console.log('Submitted credentials — navigation detected.');
        } else if (res === 'mfa') {
          console.log('MFA page detected — please complete MFA in the browser.');
        } else {
          // no clear signal; small pause to allow flow to continue
          await page.waitForTimeout(500);
        }
      } catch (e) {
        // ignore and continue — later waitForURL will prompt for MFA if needed
      }
    }

    try {
      await page.waitForURL(/https?:\/\/[^/]*eip\.systex\.com\/.*/, { timeout: waitForRedirectMs });
    } catch (e) {
      if (headful) {
        console.log('\nMFA may be required. Complete MFA in the opened browser and press Enter here to continue...');
        await new Promise(resolve => {
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          rl.question('', () => { rl.close(); resolve(); });
        });
      } else {
        throw new Error('MFA required and script is running headless');
      }
    }

    const btn = await page.$('.systex_checkin input[type="submit"]');
    if (!btn) {
      console.error('Check-in button not found on homepage.');
      await browser.close();
      process.exit(1);
    }

    console.log('Clicking check-in button to open punch popup...');
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 15000 }).catch(() => null),
      btn.click().catch(() => null)
    ]);
    if (!popup) {
      console.error('No popup detected after clicking check-in button');
      await browser.close();
      process.exit(1);
    }
    console.log('Popup opened ->', popup.url());
    const punchPage = popup;

  // Parse punch page: will fetch robustly below and parse once
    // Try to robustly obtain punch page text: wait for a short time for dynamic content to appear,
    // check the main document and any child frames.
    let punchText = '';
    const datePattern = /\d{1,2}\/\d{1,2}\s*(?:\([^)]*\))?\s*\d{1,2}:\d{2}/;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        punchText = await punchPage.innerText('body').catch(() => '');
      } catch (e) { punchText = '' }
      if (datePattern.test(punchText)) break;
      // check frames
      const frames = punchPage.frames ? punchPage.frames() : [];
      for (const f of frames) {
        try {
          const ft = await f.evaluate(() => document.body ? document.body.innerText : '');
          if (ft && datePattern.test(ft)) { punchText = ft; break; }
        } catch (e) {}
      }
      if (datePattern.test(punchText)) break;
      await new Promise(r => setTimeout(r, 300));
    }

    const parsed = parsePunchText(punchText || await punchPage.innerText('body').catch(() => ''));
    if (parsed && parsed.length) {
      // Print structured JSON to terminal only (no file output)
      console.log(JSON.stringify(parsed, null, 2));
    } else {
      console.log('No attendance entries could be parsed from the punch page.');
    }

    await browser.close();
  } catch (err) {
    console.error('Error while scraping attendance:', err);
    try { await browser.close(); } catch (e) {}
    process.exit(1);
  }
})();
