import { test, expect } from "@playwright/test";
test("Blender sculpture loads, animates, pauses and survives navigation", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#overview");
  const host = page.locator("[data-material-loop]");
  await expect(host).toHaveClass(/is-ready/, { timeout: 45000 });
  await host.scrollIntoViewIfNeeded();
  const viewer = page.locator("model-viewer");
  const animation = await viewer.evaluate((v) => ({
    names: v.availableAnimations,
    duration: v.duration,
    loaded: v.loaded,
  }));
  expect(animation.loaded).toBe(true);
  expect(animation.names.length).toBeGreaterThan(0);
  expect(animation.duration).toBeGreaterThan(7);
  await expect.poll(() => viewer.evaluate((v) => v.paused)).toBe(false);
  const before = await viewer.evaluate((v) => v.currentTime);
  await page.waitForTimeout(250);
  const after = await viewer.evaluate((v) => v.currentTime);
  expect(after).not.toEqual(before);
  await page.getByRole("button", { name: "Pause loop", exact: true }).click();
  await expect.poll(() => viewer.evaluate((v) => v.paused)).toBe(true);
  await page.getByRole("button", { name: "Play loop", exact: true }).click();
  await expect.poll(() => viewer.evaluate((v) => v.paused)).toBe(false);
  await page.screenshot({
    path: info.outputPath("material-loop.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.goto("/#analysis");
  await expect(page.locator("#record-form")).toBeVisible();
  await page.goto("/#overview");
  await expect(page.locator("[data-material-loop]")).toHaveClass(/is-ready/, {
    timeout: 45000,
  });
  expect(errors).toEqual([]);
});
test("reduced motion starts the Blender loop paused", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#overview");
  await expect(page.locator("[data-material-loop]")).toHaveClass(/is-ready/, {
    timeout: 45000,
  });
  await expect(
    page.getByRole("button", { name: "Play loop", exact: true }),
  ).toBeVisible();
  expect(await page.locator("model-viewer").evaluate((v) => v.paused)).toBe(
    true,
  );
});

test('a failed 3D asset retains the rendered fallback poster',async({page})=>{
 await page.route('**/assets/3d/material-loop.glb',route=>route.abort());
 await page.goto('/#overview');
 await expect(page.locator('[data-material-loop]')).toHaveClass(/is-fallback/,{timeout:45000});
 await expect(page.locator('.loop-poster')).toBeVisible();
 await expect(page.locator('.loop-poster')).toHaveCSS('opacity','1');
 await expect(page.locator('[data-loop-toggle]')).toBeHidden();
 await expect(page.locator('[data-loop-status]')).toContainText('static view');
});
