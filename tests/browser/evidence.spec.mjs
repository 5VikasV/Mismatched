import { test, expect } from "@playwright/test";
test("evidence keeps precedents and headline but replaces calculators with implementation costs and funding targets", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/workspace#sources");
  await expect(page).toHaveURL(/#evidence$/);
  await expect(page.locator('.evidence-case')).toHaveCount(6);
  await expect(page.locator('.evidence-case').nth(2)).toHaveAttribute('data-case','ntpc-fly-ash');
  await expect(page.locator('[data-case="ntpc-fly-ash"]')).toContainText('3,834');
  await expect(page.locator('[data-case="kpcl-raichur"]')).toContainText('₹130 crore proposed');
  await expect(page.locator('[data-case="mrpl-fact"]')).toContainText('₹20,79,55,974');
  await expect(page.locator('[data-case="mrpl-fact"]')).toContainText('₹42,26,68,695');
  await expect(page.locator('[data-case="mahindra-mjunction"]')).toContainText('9,000');
  await expect(page.getByText('How they got connected',{exact:true})).toHaveCount(4);
  await page.locator('[data-case="mrpl-fact"] summary').click();
  await expect(page.locator('[data-case="mrpl-fact"] details')).toContainText('not current quotations');
  await expect(
    page.locator("#evidence-booking, #booking-waterfall"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Turn projections into evidence." }),
  ).toHaveCount(0);
  await expect(page.locator("#carbon-headline-percent")).toHaveText("27%");
  await expect(page.locator("#carbon-headline-assumptions")).toContainText(
    "Illustrative, not measured",
  );
  await expect(page.locator("#main")).not.toContainText("OPENAI_API_KEY");
  await expect(page.locator("#main")).not.toContainText("ZAR 270,000");
  await expect(page.getByRole("heading", {name: "Implementation", exact: true})).toBeVisible();
  await expect(page.locator("#emissions-form, #emissions-result, #business-form, #business-result, #adjust-carbon-assumptions")).toHaveCount(0);
  await expect(page.locator("#main")).not.toContainText("Adoption sensitivity");
  await expect(page.locator("#main")).not.toContainText("Carbon is only one part of pollution.");
  await expect(page.locator(".implementation-summary .metric")).toHaveCount(3);
  await expect(page.locator(".implementation-summary")).toContainText("₹4.06–7.54 lakh");
  await expect(page.locator(".implementation-summary")).toContainText("₹24,000–₹44,000");
  await expect(page.locator(".implementation-summary")).toContainText("₹67,000–₹1,18,000");
  await expect(page.locator(".implementation-total")).toContainText("₹4,06,000");
  await expect(page.locator(".implementation-total")).toContainText("₹7,54,000");
  await expect(page.locator(".implementation-total")).toContainText("₹45,000");
  await expect(page.locator(".implementation-funders article")).toHaveCount(5);
  await expect(page.locator(".implementation-funding")).toContainText("No named organisation has committed funding");
  await expect(page.locator(".implementation-funding")).toContainText("₹6–8 lakh");
  for (const name of ["College incubation centre", "IIMA Ventures", "NSRCEL", "Climate Angels"])
    await expect(page.locator(".implementation-funders")).toContainText(name);
  await expect(page.locator(".implementation-funders a").filter({hasText:"Incubation and eligibility"})).toHaveAttribute("href","https://iimaventures.com/incubation/");
  await expect(page.locator("#evidence-export, #evidence-print")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize))).toBeGreaterThanOrEqual(20);
  await page.screenshot({path: info.outputPath("evidence-implementation.png"), fullPage: true});
  await page.emulateMedia({media:"print"});
  await expect(page.locator("#implementation")).toBeVisible();
  await expect(page.locator(".implementation-total")).toContainText("₹4,06,000");
  await page.emulateMedia({media:"screen"});
  expect(errors).toEqual([]);
});
