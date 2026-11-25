import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
const originalPath = resolve("design/standalone/original.html");
const refreshedPath = resolve("index.html");

test("original HTML data, text and scripts are preserved exactly", () => {
  const before = new JSDOM(readFileSync(originalPath, "utf8")),
    after = new JSDOM(readFileSync(refreshedPath, "utf8"));
  try {
    const scripts = (dom) =>
      [...dom.window.document.scripts].map((s) => s.textContent);
    expect(scripts(after)).toEqual(scripts(before));
    for (const el of before.window.document.querySelectorAll("[id]"))
      expect(after.window.document.getElementById(el.id), el.id).not.toBeNull();
    const counts = (dom) => {
      const map = new Map();
      const walker = dom.window.document.createTreeWalker(
        dom.window.document.body,
        dom.window.NodeFilter.SHOW_TEXT,
      );
      let n;
      while ((n = walker.nextNode())) {
        if (["SCRIPT", "STYLE"].includes(n.parentElement.tagName)) continue;
        const t = n.textContent.replace(/\s+/g, " ").trim();
        if (t) map.set(t, (map.get(t) || 0) + 1);
      }
      return map;
    };
    const old = counts(before),
      updated = counts(after);
    for (const [text, n] of old)
      expect(updated.get(text) || 0, text).toBeGreaterThanOrEqual(n);
  } finally {
    before.window.close();
    after.window.close();
  }
});

test("restyled original workspace retains every dataset and its original interactions", async ({
  page,
  context,
}, info) => {
  const original = await context.newPage();
  await original.goto(pathToFileURL(originalPath).href);
  const data = await original.evaluate(() =>
    JSON.stringify({ SCOPES, DATA, WAYBILLS_DATA }),
  );
  await original.close();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(pathToFileURL(refreshedPath).href);
  expect(
    await page.evaluate(() => JSON.stringify({ SCOPES, DATA, WAYBILLS_DATA })),
  ).toBe(data);
  await expect(page.locator("#kpi1-val")).toHaveText("5.16 MMT");
  await page.locator("#scope-local").click();
  await expect(page.locator("#kpi1-val")).toHaveText("37.2 MT");
  await page.locator("#scope-national").click();
  await page.screenshot({
    path: info.outputPath("original-data-dashboard.png"),
    fullPage: true,
  });
  const noOverflow = async () => {
    expect(
      await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll("main *")]
          .filter(
            (e) =>
              e.getBoundingClientRect().right > innerWidth + 2 &&
              e.getBoundingClientRect().width > 0,
          )
          .map((e) => e.id || e.className)
          .slice(0, 5),
      })),
    ).toMatchObject({ scroll: expect.any(Number) });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  };
  await noOverflow();
  await page.locator("#nav-matching").click();
  await expect(page.locator(".match-card").first()).toBeVisible();
  expect(await page.locator(".pool-planner-box").evaluate((e) => e.open)).toBe(
    false,
  );
  await page.locator("summary.pool-planner-head").click();
  await expect(page.locator("#poolTargetTon")).toBeVisible();
  await page.locator("#poolTargetTon").fill("8.5");
  await page
    .getByRole("button", { name: /Calculate Exact Pooled Batch/ })
    .click();
  await expect(page.locator("#poolResultOutput")).not.toBeEmpty();
  await page.locator("#btn-stream-al").click();
  await page.locator("#btn-role-seller").click();
  await page.locator("#btn-role-buyer").click();
  await page.screenshot({
    path: info.outputPath("original-data-matching.png"),
    fullPage: true,
  });
  await noOverflow();
  await page.locator("#nav-transport").click();
  await expect(page.locator(".trans-supplier-card").first()).toBeVisible();
  await page.locator(".layout-disclosure>summary").click();
  await expect(page.locator("#transportTable")).toBeVisible();
  await noOverflow();
  await page.screenshot({
    path: info.outputPath("original-data-transport.png"),
    fullPage: true,
  });
  await page.locator("#nav-arbitrage").click();
  await expect(page.locator("#arbSavings")).not.toBeEmpty();
  await noOverflow();
  await page.locator("#nav-waybills").click();
  await expect(page.locator("#waybillsTableBody tr")).toHaveCount(12);
  await page.locator("#chip-transit").click();
  await expect(page.locator("#waybillsTableBody tr")).toHaveCount(4);
  await page.locator("#chip-all").click();
  await page.locator("#waybillSearchInput").fill("WB-2026-0887");
  await expect(page.locator("#waybillsTableBody tr")).toHaveCount(1);
  await page.locator("#waybillSearchInput").fill("");
  await noOverflow();
  expect(errors).toEqual([]);
});
