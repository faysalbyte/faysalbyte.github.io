/* Zero-console regression test: any console message (error, warning, info, log, debug) or page error fails the test.
   Run with: npm run test:e2e   (needs internet so fonts, Font Awesome and the AI backend load like in production) */
const { test, expect } = require("@playwright/test");

const PAGES = ["/", "/portfolio.html", "/skills.html", "/contact.html"];
const SIZES = [{ width: 1366, height: 768 }, { width: 390, height: 844 }];

for (const url of PAGES) {
  for (const size of SIZES) {
    test(`console stays empty: ${url} @ ${size.width}x${size.height}`, async ({ page }) => {
      const seen = [];
      page.on("console", (m) => seen.push(`console.${m.type()}: ${m.text()}`));
      page.on("pageerror", (e) => seen.push(`pageerror: ${e.message}`));
      page.on("response", (r) => { if (r.status() >= 400) seen.push(`HTTP ${r.status()}: ${r.url()}`); });

      await page.setViewportSize(size);
      await page.goto(url, { waitUntil: "load" });
      await page.waitForTimeout(3500);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 700) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
        await page.waitForTimeout(40);
      }
      // switch viewport the way DevTools device emulation does
      await page.setViewportSize({ width: size.width === 1366 ? 390 : 1366, height: size.width === 1366 ? 844 : 768 });
      await page.waitForTimeout(800);
      expect(seen).toEqual([]);
    });
  }
}
