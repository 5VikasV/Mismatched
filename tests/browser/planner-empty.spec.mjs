import { test, expect } from "@playwright/test";
test('paper selection autofills saved data, preserves manual edits and offers a ready sample without changing supplier quality',async({page,request})=>{
  const created=await request.post('/api/records',{data:{title:'Paper autofill test',company:'Test supplier',material:'paper',grade:'Not verified',condition:'Unknown',quantityKg:800,pricePerKg:10,confirmed:true}});
  const {record}=await created.json();
  let sampleId;
  try {
    await page.goto('/workspace#planner');
    await page.locator('#planner-form [name=material]').fill('paper');
    await expect(page.locator('#planner-form [name=quantityKg]')).toHaveValue('800');
    await expect(page.locator('#planner-form [name=comparisonPrice]')).toHaveValue('10');
    await page.locator('#planner-form [name=quantityKg]').fill('100');
    await page.locator('#planner-form [name=comparisonPrice]').fill('5');
    await page.getByRole('button',{name:'Calculate a pool',exact:true}).click();
    await expect(page.locator('#planner-form [name=quantityKg]')).toHaveValue('100');
    await expect(page.locator('#planner-feedback')).toContainText('Condition is unknown');
    await page.getByRole('button',{name:'Use a sample lot',exact:true}).click();
    await expect(page.locator('.planner-sample')).toContainText('Sample Paper packaging lot');
    await page.locator('#confirm-planner-sample').check();
    await page.getByRole('button',{name:'Add test lot and calculate',exact:true}).click();
    await expect(page.locator('.planner-result')).toContainText('100 / 100 kg');
    await expect(page.locator('#planner-form [name=comparisonPrice]')).toHaveValue('15');
    const {records}=await (await request.get('/api/records')).json();
    expect(records.find(r=>r.id===record.id).condition).toBe('Unknown');
    sampleId=records.find(r=>r.material==='paper'&&r.title==='SAMPLE — Paper packaging').id;
    expect(records.find(r=>r.id===sampleId).condition).toBe('Clean');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  } finally {
    await request.delete(`/api/records/${record.id}`,{data:{}});
    if(sampleId)await request.delete(`/api/records/${sampleId}`,{data:{}});
  }
});
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
