import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("tonne pool, fixed commission, per-pickup transport, saved request and cancellation", async ({
  page,
  request,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const before = (await (await request.get("/api/booking-requests")).json())
    .requests.length;
  const rows = [];
  for (const [i, price] of [10, 12].entries()) {
    const response = await request.post("/api/records", {
      data: {
        title: `Booking ${info.project.name} ${i}`,
        company: `Supplier ${i}`,
        material: `PP-${info.project.name}`,
        grade: "PP-H",
        condition: "Clean",
        quantityKg: 6000,
        pricePerKg: price,
        confirmed: true,
      },
    });
    expect(response.ok()).toBe(true);
    rows.push((await response.json()).record);
  }
  try {
    await page.goto("/workspace#planner");
    for (const [n, v] of Object.entries({
      material: `PP-${info.project.name}`,
      grade: "PP-H",
      quantityKg: 10000,
      comparisonPrice: 20,
    }))
      await page.locator(`#planner-form [name=${n}]`).fill(String(v));
    await page.locator("[name=quantityUnit]").selectOption("t");
    await expect(page.locator("[name=quantityKg]")).toHaveValue("10");
    await page.getByRole("button", { name: "Calculate a pool" }).click();
    await expect(page.locator("#quantity-category")).toContainText("10–100 t");
    await expect(page.locator("[data-plan-action=review]")).toBeDisabled();
    for (const [i, row] of rows.entries()) {
      const pickup = page.locator(`[data-pickup="${row.id}"]`);
      await pickup
        .locator("[data-pickup-field=provider]")
        .selectOption(i ? "seller_owned" : "buyer_owned");
      await pickup
        .locator("[data-pickup-field=payer]")
        .selectOption(i ? "seller" : "buyer");
      await pickup.locator("[data-pickup-field=cost]").fill(i ? "500" : "1000");
    }
    await page.getByRole("button", { name: "Update transport totals" }).click();
    await expect(page.locator(".cost-row.total")).toContainText("1,12,024");
    await expect(page.locator(".planner-result")).toContainText("1,06,204");
    await page.locator("[data-plan-action=review]").click();
    await expect(page.locator(".booking-review")).toBeVisible();
    await page.locator("[data-plan-check=confirmed]").check();
    await page
      .getByRole("button", { name: "Save booking request", exact: true })
      .click();
    await expect(page).toHaveURL(/#bookings$/);
    await expect(page.locator(".booking-list-item").first()).toContainText(
      "Pending agreement",
    );
    await expect(page.locator(".booking-layout")).toContainText(
      "Buyer-owned vehicle",
    );
    await expect(page.locator(".booking-layout")).toContainText(
      "Seller-owned vehicle",
    );
    await page.reload();
    await expect(page.locator(".booking-list-item").first()).toContainText(
      `PP-${info.project.name}`,
    );
    const all = (await (await request.get("/api/booking-requests")).json())
      .requests;
    expect(all.length).toBe(before + 1);
    await page.locator(".finder-trigger").click();
    await page.locator("#finder-input").fill(all[0].id);
    await expect(page.locator(".finder-result")).toHaveCount(1);
    await page.locator(".finder-result").click();
    await expect(page.locator(".booking-list-item")).toHaveCount(1);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export request CSV" }).click();
    const csv = readFileSync(await (await downloadPromise).path(), "utf8");
    expect(csv).toContain("112024");
    expect(csv).toContain("seller_owned");
    expect(csv).toContain("pending_agreement");
    await page.goto("/workspace#evidence");
    await page.locator("#evidence-booking").selectOption(all[0].id);
    await expect(page.locator("#booking-waterfall")).toContainText("₹1,12,024.00");
    await expect(page.locator("#booking-waterfall")).toContainText("Pending agreement");
    await page.goto("/workspace#bookings");
    await expect(page.locator(".booking-list-item").first()).toBeVisible();
    await page
      .getByRole("button", { name: "Cancel request", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Keep request", exact: true })
      .click();
    await expect(page.locator(".booking-list-item").first()).toContainText(
      "Pending agreement",
    );
    await page
      .getByRole("button", { name: "Cancel request", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm cancellation", exact: true })
      .click();
    await expect(page.locator(".booking-list-item").first()).toContainText(
      "Cancelled",
    );
    await page.screenshot({
      path: info.outputPath("booking.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    for (const row of rows)
      await request.delete(`/api/records/${row.id}`, { data: {} });
  }
});

test("a lost save response retries the same booking without a duplicate", async ({
  page,
  request,
}, info) => {
  const title = `Retry-${info.project.name}`;
  const response = await request.post("/api/records", {
    data: {
      title,
      material: title,
      grade: "PP-H",
      condition: "Clean",
      quantityKg: 100,
      pricePerKg: 40,
      confirmed: true,
    },
  });
  const { record } = await response.json();
  const before = (await (await request.get("/api/booking-requests")).json())
    .requests.length;
  try {
    await page.goto("/workspace#planner");
    for (const [name, value] of Object.entries({
      material: title,
      grade: "PP-H",
      quantityKg: 100,
      comparisonPrice: 80,
    }))
      await page.locator(`#planner-form [name=${name}]`).fill(String(value));
    await page.getByRole("button", { name: "Calculate a pool" }).click();
    await page
      .locator("[data-pickup-field=provider]")
      .selectOption("buyer_owned");
    await page.locator("[data-pickup-field=payer]").selectOption("buyer");
    await page.locator("[data-pickup-field=cost]").fill("0");
    await page.getByRole("button", { name: "Update transport totals" }).click();
    await expect(page.locator("[data-plan-action=review]")).toBeDisabled();
    await page.locator("[data-pickup-field=zeroCostConfirmed]").check();
    await page.getByRole("button", { name: "Update transport totals" }).click();
    await page.locator("[data-plan-action=review]").click();
    await expect(page.locator(".booking-review")).toBeVisible();
    await page.locator("[data-plan-check=confirmed]").check();
    await page.route(
      "**/api/booking-requests",
      async (route) => {
        if (route.request().method() !== "POST") {
          await route.continue();
          return;
        }
        await route.fetch();
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Simulated lost save response; retry this submission.",
          }),
        });
      },
      { times: 1 },
    );
    await page
      .getByRole("button", { name: "Save booking request", exact: true })
      .click();
    await expect(page.locator(".error-message")).toContainText(
      "Simulated lost save response",
    );
    expect(
      (await (await request.get("/api/booking-requests")).json()).requests
        .length,
    ).toBe(before + 1);
    await expect(page.locator("[data-plan-check=confirmed]")).toBeDisabled();
    await page
      .getByRole("button", { name: "Save booking request", exact: true })
      .click();
    await expect(page).toHaveURL(/#bookings$/);
    expect(
      (await (await request.get("/api/booking-requests")).json()).requests
        .length,
    ).toBe(before + 1);
  } finally {
    await request.delete(`/api/records/${record.id}`, { data: {} });
  }
});
