// Capture real screenshots of the running app using Playwright
// Prereq: dev server running at http://localhost:3000
// Usage: node scripts/capture-screenshots.mjs

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('docs/screenshots');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function ensureDir(dir) { try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}

async function shoot(page, url, outPath, opts = {}) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // settle UI a bit
  await page.waitForTimeout(opts.settleMs ?? 400);
  // Hide flashing overlay if present to avoid animation artifacts
  await page.addStyleTag({ content: '#flash{display:none !important;}' });
  await page.screenshot({ path: outPath, fullPage: true });
}

async function main() {
  await ensureDir(OUT_DIR);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1360, height: 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  // Home
  await shoot(page, `${BASE_URL}/`, path.join(OUT_DIR, 'home.png'));

  // Settings (preload theme/sound by visiting page and waiting for loadSettings to populate)
  await shoot(page, `${BASE_URL}/settings.html`, path.join(OUT_DIR, 'settings.png'));

  // Optional: Theme example - toggle theme if enabled, otherwise just capture as-is
  await page.goto(`${BASE_URL}/settings.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  // Try enabling custom theme for a variant shot
  try {
    const enabled = await page.$('#themeEnabled');
    if (enabled) {
      const checked = await enabled.isChecked();
      if (!checked) await enabled.check();
      // Save to apply
      const saveBtn = await page.$('button[type="submit"]');
      if (saveBtn) { await saveBtn.click(); await page.waitForTimeout(500); }
    }
  } catch {}
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, 'theme.png'), fullPage: true });

  await browser.close();
  console.log('Screenshots saved to', OUT_DIR);
}

main().catch(err => { console.error(err); process.exit(1); });
