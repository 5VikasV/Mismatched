import { test, expect } from "@playwright/test";
test("evidence replaces setup, calculates bounded scenarios without export controls and enlarges workspace", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/workspace#sources");
  await expect(page).toHaveURL(/#evidence$/);
  await expect(page.locator(".evidence-case")).toHaveCount(6);
  const vapi = page.locator('[data-case="vapi-ambuja"]');
  const sludge = page.locator('[data-case="hi-tech-carbon"]');
  await expect(page.locator(".evidence-case").first()).toHaveAttribute(
    "data-case",
    "vapi-ambuja",
  );
  await expect(vapi).toContainText("15,341.09");
  await expect(vapi).toContainText(
    "30,873 tonnes dispatched from Vapi paper mills collectively",
  );
  await expect(vapi).toContainText("154,018");
  await expect(vapi.locator("a")).toHaveCount(2);
  await vapi.locator("summary").click();
  await expect(vapi.locator("details")).toContainText(
    "Payment terms and buyer purchase savings are unpublished",
  );
  await expect(sludge).toContainText("₹1,250 / tonne");
  await expect(sludge).toContainText("₹167 / tonne");
  await expect(sludge).toContainText("425.330");
  await expect(sludge).toContainText("₹9.58 lakh reported annual");
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
  await expect(page.locator("#main")).toContainText("703,466.12");
  await expect(page.locator("#main")).toContainText("ZAR 270,000");
  await page.locator("#load-benchmark").click();
  await expect(page.locator("#emissions-result")).toContainText("83.04");
  await expect(page.locator("#emissions-result")).toContainText("27%");
  await expect(page.locator("#emissions-result")).toContainText(
    "Not a net climate saving",
  );
  await page.locator("#emissions-form [name=mode]").selectOption("lifecycle");
  await expect(page.locator("#emissions-result")).toContainText(
    "Assumptions changed",
  );
  await page
    .getByRole("button", { name: "Calculate projection", exact: true })
    .click();
  await expect(page.locator("#emissions-result")).toContainText("Withheld");
  await expect(page.locator("#carbon-headline-percent")).toHaveText("—");
  await page
    .locator("#emissions-form [name=condition]")
    .selectOption("hazardous");
  await page
    .getByRole("button", { name: "Calculate projection", exact: true })
    .click();
  await expect(page.locator("#emissions-result")).toContainText(
    "Insufficient published evidence",
  );
  await page.locator("#emissions-form [name=category]").selectOption("e-waste");
  await page
    .getByRole("button", { name: "Calculate projection", exact: true })
    .click();
  await expect(page.locator("#emissions-result")).toContainText(
    "Insufficient published evidence",
  );
  await page.locator("#load-benchmark").click();
  await expect(page.locator("#emissions-result")).toContainText("83.04");
  await page.locator("#business-form [name=orders]").fill("20");
  await page.locator("#business-form [name=materialValue]").fill("50000");
  await page.locator("#business-form [name=fixedCosts]").fill("10000");
  await page.locator("#business-form [name=variableCosts]").fill("500");
  await page
    .getByRole("button", { name: "Calculate business scenario" })
    .click();
  await expect(page.locator("#business-result")).toContainText("₹50,000.00");
  await expect(page.locator("#business-result")).toContainText("₹30,000.00");
  await expect(page.locator("#evidence-export")).toHaveCount(0);
  await expect(page.locator("#evidence-print")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    )
    .toBe(true);
  const fonts = await page.evaluate(() => ({
    body: parseFloat(getComputedStyle(document.body).fontSize),
    btn: parseFloat(
      getComputedStyle(document.querySelector("#load-benchmark")).fontSize,
    ),
  }));
  expect(fonts.body).toBeGreaterThanOrEqual(20);
  expect(fonts.btn).toBeGreaterThanOrEqual(18);
  await page.screenshot({
    path: info.outputPath("evidence.png"),
    fullPage: true,
  });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#emissions-form")).not.toBeVisible();
  await expect(page.locator("#emissions-result")).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  expect(errors).toEqual([]);
});
