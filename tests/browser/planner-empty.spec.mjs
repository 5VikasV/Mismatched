import { test, expect } from "@playwright/test";
test("empty planner gives actionable feedback and explicit test lot completes calculation, transport and booking", async ({
  page,
  request,
}, info) => {
  let record = null,
    posts = 0,
    bookingId = null;
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/records", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { records: record ? [record] : [] } });
    const response = await route.fetch();
    const data = await response.json();
    if (route.request().method() === "POST") {
      record = data.record;
      posts++;
    }
    await route.fulfill({ response, json: data });
  });
  try {
    await page.goto("/workspace#planner");
    await expect(page.locator(".planner-empty")).toContainText(
      "No saved material lots yet",
    );
    for (const [name, value] of Object.entries({
      material: "PP",
      quantityKg: 500,
      comparisonPrice: 75,
    }))
      await page.locator(`#planner-form [name=${name}]`).fill(String(value));
    await page
      .getByRole("button", { name: "Calculate a pool", exact: true })
      .click();
    await expect(page.locator("#planner-feedback")).toContainText(
      "No saved material lots",
    );
    await expect(
      page.getByRole("button", {
        name: "Update transport totals",
        exact: true,
      }),
    ).toBeDisabled();
    expect(posts).toBe(0);
    await page
      .getByRole("button", { name: "Try a sample lot" })
      .click();
    await expect(
      page.getByRole("button", { name: "Add test lot and calculate" }),
    ).toBeDisabled();
    expect(posts).toBe(0);
    await page.locator("#confirm-planner-sample").check();
    await page
      .getByRole("button", { name: "Add test lot and calculate" })
      .click();
    await expect(page.locator("[data-pickup]")).toHaveCount(1);
    await expect(page.locator(".planner-result")).toContainText("500 / 500 kg");
    expect(posts).toBe(1);
    expect(record.title).toContain("SAMPLE");
    await page
      .getByRole("button", { name: "Update transport totals", exact: true })
      .click();
    await expect(page.locator("#planner-feedback")).toContainText(
      "Pickup details are incomplete",
    );
    await page.locator("[data-pickup-field=provider]").selectOption("external");
    await page.locator("[data-pickup-field=payer]").selectOption("buyer");
    await page.locator("[data-pickup-field=cost]").fill("1000");
    await page
      .getByRole("button", { name: "Update transport totals", exact: true })
      .click();
    await expect(page.locator("#planner-feedback")).toContainText(
      "Transport totals updated",
    );
    await expect(page.locator(".cost-row.total")).toContainText("22,735");
    await expect(page.locator(".cost-row.saving")).toContainText("14,765");
    await page.getByRole("button", { name: "10–100 t", exact: true }).click();
    await expect(page.locator(".planner-empty")).toContainText(
      "No saved lots in this quantity band",
    );
    await page.getByRole("button", { name: "Show all sizes" }).click();
    await expect(page.locator(".lot-option")).toHaveCount(1);
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: info.outputPath("planner-working.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Create booking request", exact: true })
      .click();
    await expect(page.locator(".booking-review")).toBeVisible();
    await page.locator("[data-plan-check=confirmed]").check();
    await page
      .getByRole("button", { name: "Save booking request", exact: true })
      .click();
    await expect(page).toHaveURL(/#bookings$/);
    const bookings = (await (await request.get("/api/booking-requests")).json())
      .requests;
    const booking = bookings.find((b) =>
      b.requirements.selectedRecordIds.includes(record.id),
    );
    bookingId = booking?.id;
    expect(booking.plan.totalCost).toBe(22735);
    expect(booking.status).toBe("pending_agreement");
    expect(errors).toEqual([]);
  } finally {
    if (bookingId)
      await request.post(`/api/booking-requests/${bookingId}/cancel`, {
        data: {},
      });
    if (record?.id)
      await request.delete(`/api/records/${record.id}`, { data: {} });
  }
});
