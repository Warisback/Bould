// Phone smoke test: loads the main screens at real phone viewport sizes, saves
// screenshots and fails on console errors or on replay controls hidden under
// the bottom nav.
//
//   npm run build && npx next start -p 3100 &
//   npm run smoke -- http://localhost:3100 ./shots
//
// Uses Playwright's Chromium (PLAYWRIGHT_BROWSERS_PATH, or CHROMIUM_PATH to
// point at a specific binary).
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? "./shots";

// 390x844 is an iPhone screen; 390x664 and 375x548 are what Safari actually
// leaves for the page with its toolbars showing (iPhone 14 / iPhone SE).
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "390x664", width: 390, height: 664 },
  { name: "375x548", width: 375, height: 548 },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && problems.push(`[${vp.name}] console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`[${vp.name}] page error: ${e.message}`));

  for (const path of ["/", "/review/sample", "/review/last"]) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const slug = path === "/" ? "home" : path.slice(1).replaceAll("/", "-");
    await page.screenshot({ path: `${OUT}/${slug}-${vp.name}.png` });

    if (path.startsWith("/review/")) {
      // The play button must sit fully above the nav's raised Review button.
      const layout = await page.evaluate(() => {
        const play = [...document.querySelectorAll('button[aria-label="Play"]')].pop();
        const review = document.querySelector('body > nav a[aria-label="Review"]');
        return play && review
          ? { playBottom: play.getBoundingClientRect().bottom, reviewTop: review.getBoundingClientRect().top }
          : null;
      });
      if (!layout) problems.push(`[${vp.name}] ${path}: replay controls not found`);
      else if (layout.playBottom > layout.reviewTop)
        problems.push(`[${vp.name}] ${path}: controls end at ${layout.playBottom}px, under the nav (${layout.reviewTop}px)`);
    }
  }
  await ctx.close();
}

await browser.close();
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`ok: screenshots in ${OUT}`);
