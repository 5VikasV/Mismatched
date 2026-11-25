import { test, expect } from "@playwright/test";
test("matching explanations, completion suggestions, shared transport, impact and flow use real saved terms", async ({
  page,
  request,
}, info) => {
  const rows = [];
  const grade = "PP-I-" + info.project.name;
  for (const [i, kg] of [120, 180, 200].entries()) {
    const r = await request.post("/api/records", {
      data: {
        title: `Integration ${info.project.name} ${i}`,
        company: `Integration Supplier ${i}`,
        material: "PP",
        grade,
        condition: "Clean",
        quantityKg: kg,
        pricePerKg: 40,
        confirmed: true,
      },
    });
    expect(r.ok()).toBe(true);
    rows.push((await r.json()).record);
  }
  let requestId;
  try {
    await page.goto("/workspace#planner");
    for (const [k, v] of Object.entries({
      material: "PP",
      grade,
      quantityKg: 500,
      comparisonPrice: 75,
    }))
      await page.locator(`#planner-form [name=${k}]`).fill(String(v));
    await page.getByRole("button", { name: "Calculate a pool" }).click();
    const first = page
      .locator(".lot-option")
      .filter({ has: page.locator(`input[value="${rows[0].id}"]`) });
    await first.locator("summary").click();
    await expect(first).toContainText("Unknown distance");
    await expect(first.locator("input[name=lot]")).toBeChecked();
    await page.locator(`input[name=lot][value="${rows[2].id}"]`).uncheck();
    await expect(page.locator(".pool-suggestions")).toContainText(
      "200 kg still needed",
    );
    await page
      .locator(`[data-plan-action=add-candidate][data-record="${rows[2].id}"]`)
      .click();
    await page.locator(".shared-transport summary").click();
    await page.locator("[data-shared=cost]").fill("100.01");
    await page.locator("[data-shared=provider]").selectOption("external");
    await page.locator("[data-shared=payer]").selectOption("seller");
    await page.getByRole("button", { name: "Apply quantity split" }).click();
    const costs = await page
      .locator("[data-pickup-field=cost]")
      .evaluateAll((es) => es.map((e) => Math.round(Number(e.value) * 100)));
    expect(costs.reduce((a, b) => a + b, 0)).toBe(10001);
    await expect(page.locator(".cost-row.total")).toContainText("20,700");
    await page.locator("[data-plan-action=review]").click();
    await page.locator("[data-plan-check=confirmed]").check();
    await page
      .getByRole("button", { name: "Save booking request", exact: true })
      .click();
    await expect(page).toHaveURL(/#bookings$/);
    const data = await (await request.get("/api/booking-requests")).json();
    requestId = data.requests.find((r) => r.requirements.grade === grade).id;
    await page.goto("/workspace#impact");
    await expect(
      page.getByRole("heading", { name: "Recycling benchmark scenario" }),
    ).toBeVisible();
    await page.locator("#impact-scenario").check();
    await expect(page.locator("table")).toContainText("WARM v16");
    const impact = await (
      await request.get("/api/impact?scenario=warm-closed-loop")
    ).json();
    const row = impact.rows.find((r) => r.id === requestId);
    expect(row.quantityKg).toBe(500);
    expect(row.co2CreditKg).toBeCloseTo((500 * 0.79 * 1000) / 907.18474, 4);
    expect(impact.actualDeliveredKg).toBeNull();
    await page.screenshot({
      path: info.outputPath("impact.png"),
      fullPage: true,
    });
    await page.goto("/workspace#loop");
    await page.locator("#flow-request").selectOption(requestId);
    await expect(page.locator(".flow-node")).toHaveCount(4);
    await expect(page.locator(".flow-layout")).toContainText(
      "0 recorded closed loops",
    );
    await page.locator(".flow-node").first().focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".flow-layout aside")).toContainText(
      "Integration Supplier",
    );
    await page.screenshot({
      path: info.outputPath("flow.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  } finally {
    if (requestId)
      await request.post(`/api/booking-requests/${requestId}/cancel`, {
        data: { confirmed: true },
      });
    for (const row of rows)
      await request.delete(`/api/records/${row.id}`, { data: {} });
  }
});
