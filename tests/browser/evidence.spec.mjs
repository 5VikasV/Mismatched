import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("evidence replaces setup, calculates bounded scenarios, exports sources and enlarges workspace", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/workspace#sources");
  await expect(page).toHaveURL(/#evidence$/);
  await expect(page.locator(".evidence-case")).toHaveCount(4);
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
  const dl = page.waitForEvent("download");
  await page.locator("#evidence-export").click();
  const csv = readFileSync(await (await dl).path(), "utf8");
  expect(csv).toContain("https://www.greencape.co.za/");
  expect(csv).toContain("83.037");
  expect(csv).toContain("Hypothetical business");
  expect(csv).toContain("Projection assumption");
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
      getComputedStyle(document.querySelector("#evidence-export")).fontSize,
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
