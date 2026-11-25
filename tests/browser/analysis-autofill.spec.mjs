import { test, expect } from "@playwright/test";
test("PDF Analyse autofills fields and sample fill remains explicit and unsaved", async ({
  page,
  request,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let calls = 0;
  const before = (await (await request.get("/api/records")).json()).records
    .length;
  await page.route("**/api/status", async (route) => {
    const original = await (await route.fetch()).json();
    await route.fulfill({
      json: { ...original, aiConfigured: true, vision: { available: false } },
    });
  });
  await page.route("**/api/analyze", async (route) => {
    calls++;
    expect(route.request().postDataJSON().mimeType).toBe("application/pdf");
    await route.fulfill({
      json: {
        id: "browser-pdf-fixture",
        filename: "material.pdf",
        model: "test-document-provider",
        suggestions: {
          company: "Browser Test Factory",
          material: "PP",
          grade: "PP-H",
          condition: "Clean",
          quantityKg: 1200,
          pricePerKg: 42,
          location: "Pune, India",
          evidence: [
            { field: "quantityKg", quote: "Quantity 1200 kg", page: 1 },
          ],
          warnings: ["Fictional browser fixture."],
        },
      },
    });
  });
  await page.goto("/workspace#analysis");
  await expect(page.locator("#record-form")).toBeVisible();
  await page
    .locator("#analysis-file")
    .setInputFiles({
      name: "material.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nfictional test fixture"),
    });
  await expect(page.locator("#analysis-engine")).toContainText(
    "PDF → AI document extraction ready",
  );
  await page.locator("#record-form [name=quantityKg]").fill("20");
  await page.locator("#record-form [name=pricePerKg]").fill("50000");
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Analyse", exact: true }).click();
  await expect(page.locator("#record-form [name=quantityKg]")).toHaveValue(
    "1200",
  );
  await expect(page.locator("#record-form [name=pricePerKg]")).toHaveValue(
    "42",
  );
  await expect(page.locator("#record-form [name=material]")).toHaveValue("PP");
  await expect(page.locator("[data-review=quantityKg]")).toContainText(
    "AI suggestion",
  );
  await expect(page.locator(".evidence-panel")).toContainText(
    "AI document extraction",
  );
  await expect(page.locator("#record-form [name=confirmed]")).not.toBeChecked();
  expect(calls).toBe(1);
  await page
    .getByRole("button", { name: "Fill sample data", exact: true })
    .click();
  await expect(page.locator("#record-form [name=title]")).toHaveValue(/SAMPLE/);
  await expect(page.locator(".lab-evidence-note")).toContainText(
    "Fictional sample",
  );
  await expect(page.locator("[data-review=material]")).toContainText(
    "Sample value",
  );
  await expect(page.locator("#record-form [name=latitude]")).toHaveValue("");
  expect(
    (await (await request.get("/api/records")).json()).records.length,
  ).toBe(before);
  expect(calls).toBe(1);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: info.outputPath("analysis-autofill.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
