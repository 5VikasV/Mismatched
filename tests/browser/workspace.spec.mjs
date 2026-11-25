import { test, expect } from "@playwright/test";

test("workspace finder searches actual facilities and saved materials without losing the draft", async ({
  page,
  request,
}, info) => {
  await request.post("/api/import-public", { data: {} });
  const { facilities } = await (await request.get("/api/facilities")).json();
  const facility = facilities[0];
  const title = `Finder material ${info.project.name}`;
  const response = await request.post("/api/records", {
    data: { title, material: "PP", confirmed: true },
  });
  expect(response.ok()).toBe(true);
  const { record } = await response.json();
  try {
    await page.goto("/workspace#analysis");
    await expect(page.locator("#record-form")).toBeVisible();
    await page.locator(".skip-link").focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#analysis$/);
    await expect(page.locator("#main")).toBeFocused();
    await page
      .locator("#record-form [name=title]")
      .fill("Unsaved draft stays here");
    await page.locator(".finder-trigger").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.locator("#finder-input")).toBeFocused();
    await page.locator("#finder-input").fill("no-such-material-92845");
    await expect(page.locator(".finder-empty")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(page.locator(".finder-trigger")).toBeFocused();
    await expect(page.locator("#record-form [name=title]")).toHaveValue(
      "Unsaved draft stays here",
    );
    await page.keyboard.press("Control+k");
    await page.locator("#finder-input").fill(facility.name);
    await page
      .getByRole("button", {
        name: new RegExp(facility.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      })
      .click();
    await expect(page).toHaveURL(/#directory$/);
    await expect(page.locator("#directory-search")).toHaveValue(facility.name);
    await expect(page.locator(".facility-row")).toHaveCount(1);
    await page.locator(".finder-trigger").click();
    await page.locator("#finder-input").fill(title);
    await page.locator(".finder-result").click();
    await expect(page).toHaveURL(/#analysis$/);
    await expect(page.locator("#record-search")).toHaveValue(title);
    await expect(page.locator(".record-card")).toHaveCount(1);
    await expect(page.locator(".record-card")).toContainText(title);
    await page.goto("/workspace#overview");
    await page.locator(".recent-record").filter({ hasText: title }).click();
    await expect(page.locator("#record-search")).toHaveValue(title);
    await expect(page.locator(".record-card")).toContainText(title);
  } finally {
    await request.delete(`/api/records/${record.id}`, { data: {} });
  }
});

test("redesigned navigation, feature layouts and real summary work at each width", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/workspace#overview");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".desk-hero h1")).toContainText(
    "More possibility.",
  );
  await expect(page.locator("[data-material-loop]")).toHaveCount(1);
  if (info.project.name === "width-360") {
    const trigger = page.getByRole("button", { name: "Open navigation" });
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.locator("[data-nav=directory]").click();
    await expect(page.locator("#sidebar")).not.toHaveClass(/open/);
  } else {
    await expect(page.locator("[data-nav=directory]")).toBeVisible();
    await expect(page.locator("#sidebar .nav-link")).toHaveCount(9);
    expect(await page.locator("#sidebar").evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }
  for (const route of [
    "overview",
    "directory",
    "analysis",
    "planner",
    "bookings",
    "results",
    "impact",
    "loop",
    "sources",
  ]) {
    await page.goto("/workspace#" + route);
    await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
    await expect(page.locator("#main h1")).toBeVisible();
    if (route === "results")
      await expect(page.locator(".class-performance meter")).toHaveCount(6);
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: info.outputPath(route + ".png"),
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
