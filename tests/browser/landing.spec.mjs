import { test, expect } from "@playwright/test";

test("published landing opens the connected account-free workspace", async ({
  page,
  request,
}, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const before = await (await request.get("/api/status")).json();
  await page.goto("/");
  await expect(page.locator(".carousel-ring .ring-card")).toHaveCount(8);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "next shift.",
  );
  await expect(
    page.getByRole("link", { name: "Open workspace", exact: true }),
  ).toHaveAttribute("href", "/workspace#overview");
  await expect(
    page.getByRole("link", { name: "Explore directory", exact: true }),
  ).toHaveAttribute("href", "/workspace#directory");
  await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--orange")
        .trim().toLowerCase(),
    ),
  ).toBe("#ff5a1f");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.locator(".carousel-viewport").focus();
  const prior = await page.locator("#carousel-ring").getAttribute("style");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#carousel-ring")).not.toHaveAttribute(
    "style",
    prior || "",
  );
  await page.screenshot({ path: info.outputPath("landing.png") });
  await page.getByRole("link", { name: "Open workspace", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace#overview$/);
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("#breadcrumb")).toHaveText("Overview");
  const after = await (await request.get("/api/status")).json();
  expect(after.recordCount).toBe(before.recordCount);
  expect(after.facilityCount).toBe(before.facilityCount);
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim().toLowerCase(),
    ),
  ).toBe("#ff5a1f");
  await page.goto("/");
  await page
    .getByRole("link", { name: "Explore directory", exact: true })
    .click();
  await expect(page).toHaveURL(/\/workspace#directory$/);
  await expect(
    page.locator('[data-feature="directory"] .directory-view'),
  ).toBeVisible();
  await page.goBack();
  await expect(page.locator(".carousel-viewport")).toBeVisible();
  expect(errors).toEqual([]);
});

test("legacy workspace links and account placeholders reach real pages", async ({
  page,
}) => {
  await page.goto("/#analysis");
  await expect(page).toHaveURL(/\/workspace#analysis$/);
  await expect(page.locator("#record-form")).toBeVisible();
  await page.goto("/landing/signin.html");
  await expect(page).toHaveURL(/\/workspace#overview$/);
  await expect(page.locator("#breadcrumb")).toHaveText("Overview");
  await page.goto("/landing/signup.html");
  await expect(page).toHaveURL(/\/workspace#overview$/);
  await page.goto("/workspace/#planner");
  await expect(page).toHaveURL(/\/workspace#planner$/);
  await expect(page.locator("#planner-form")).toBeVisible();
  await page.reload();
  await expect(page.locator("#planner-form")).toBeVisible();
});

test("landing respects reduced motion and maintains keyboard access", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/motion-reduced/);
  const ring = page.locator("#carousel-ring");
  const first = await ring.getAttribute("style");
  await page.waitForTimeout(150);
  expect(await ring.getAttribute("style")).toBe(first);
  await page.locator(".carousel-viewport").focus();
  await page.keyboard.press("ArrowRight");
  await expect(ring).not.toHaveAttribute("style", first || "");
  await expect(
    page.getByRole("link", { name: "Open workspace", exact: true }),
  ).toBeVisible();
});
