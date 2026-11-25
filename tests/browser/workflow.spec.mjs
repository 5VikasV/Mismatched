import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";

test("reviewed records, planning, CSV, sources and measured model results", async ({
  page,
  request,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const { records } = await (await request.get("/api/records")).json();
  for (const r of records)
    await request.delete(`/api/records/${r.id}`, { data: {} });
  await page.goto("/workspace#overview");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  if ((await (await request.get("/api/status")).json()).facilityCount === 0) {
    await page.locator('[data-action="import"]').first().click();
    await expect(page.locator(".metric strong").first()).toHaveText("40");
  }
  await page.goto("/workspace#directory");
  await expect(page.locator(".facility-row")).toHaveCount(40);
  await page.locator('[data-action="select-facility"]').first().click();
  await expect(page.locator(".facility-detail-card")).toContainText("Source");
  await page.locator('[data-action="deselect-facility"]').click();
  await page.goto("/workspace#analysis");
  await expect(page.locator("#record-form")).toBeVisible();
  const status = await (await request.get("/api/status")).json();
  if (status.vision.available && existsSync("ml/manifest.json")) {
    const rows = JSON.parse(readFileSync("ml/manifest.json")).images;
    const sample = rows.find((r) => r.split === "test" && r.label === "metal");
    await page.locator("#analysis-file").setInputFiles("ml/" + sample.path);
    await page.getByRole("button", { name: "Analyse", exact: true }).click();
    await expect(page.locator(".analysis-status")).toBeVisible({
      timeout: 40000,
    });
    await expect(page.locator('[name="confirmed"]')).not.toBeChecked();
    await expect(page.locator('[name="grade"]')).toHaveValue("");
  }
  const set = async (name, value) =>
    page.locator(`#record-form [name="${name}"]`).fill(String(value));
  for (const [n, v] of Object.entries({
    title: `Browser-reviewed lot ${info.project.name}`,
    company: "Browser Factory",
    material: "PP",
    grade: "PP-H",
    condition: "Clean",
    quantityKg: 120,
    pricePerKg: 42,
  }))
    await set(n, v);
  await page.locator('[name="confirmed"]').check();
  await page.getByRole("button", { name: "Save reviewed record" }).click();
  await expect(page.locator(".record-card")).toHaveCount(1);
  await page.locator('[data-feature-action="edit"]').click();
  await expect(page.locator('#record-form [name="title"]')).toHaveValue(
    `Browser-reviewed lot ${info.project.name}`,
  );
  // Wait for original evidence before changing an edited draft.
  if (status.vision.available)
    await expect(page.locator(".analysis-status")).toBeVisible();
  await set("quantityKg", 125);
  await page.locator('[name="confirmed"]').check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".record-card")).toContainText("125 kg");
  await page.reload();
  await expect(page.locator(".record-card")).toContainText("125 kg");
  await page.screenshot({
    path: info.outputPath("analysis.png"),
    fullPage: true,
  });
  await page.goto("/workspace#planner");
  await expect(page.locator("#planner-form")).toBeVisible();
  for (const [n, v] of Object.entries({
    material: "PP",
    grade: "PP-H",
    quantityKg: 100,
    comparisonPrice: 75,
    transportCost: 100,
    feePercent: 0,
  }))
    await page.locator(`#planner-form [name="${n}"]`).fill(String(v));
  await page.getByRole("button", { name: "Calculate a pool" }).click();
  await expect(page.locator(".cost-row.total")).toContainText("4,300");
  await expect(page.locator(".cost-row.saving")).toContainText("3,200");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export estimate CSV" }).click();
  const download = await downloadPromise;
  const csv = readFileSync(await download.path(), "utf8");
  expect(csv).toContain('"Estimated delivered total INR","4300"');
  expect(csv).toContain("Browser Factory");
  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect(page.locator(".planner-result")).toContainText(
    "100 kg shortfall",
  );
  await expect(
    page.getByRole("button", { name: "Export estimate CSV" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Select eligible" }).click();
  await page.locator('[name="quantityKg"]').fill("500");
  await page.getByRole("button", { name: "Calculate a pool" }).click();
  await expect(page.locator(".planner-result")).toContainText(
    "375 kg shortfall",
  );
  await expect(page.locator(".cost-row.saving")).toHaveCount(0);
  await page.locator('[name="quantityKg"]').fill("100");
  await page.locator('[name="transportCost"]').fill("10000");
  await page.getByRole("button", { name: "Calculate a pool" }).click();
  await expect(page.locator(".planner-result")).toContainText(
    "meets or exceeds",
  );
  await page.screenshot({
    path: info.outputPath("planner.png"),
    fullPage: true,
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    )
    .toBe(true);
  await page.goto("/workspace#results");
  await expect(
    page.getByRole("heading", { name: "Confusion matrix" }),
  ).toBeVisible();
  await expect(page.locator("#main")).toContainText(
    "expert-confirmed factory validation",
  );
  await page.screenshot({
    path: info.outputPath("results.png"),
    fullPage: true,
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    )
    .toBe(true);
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => document.activeElement !== document.body),
  ).toBe(true);
  expect(errors).toEqual([]);
});
