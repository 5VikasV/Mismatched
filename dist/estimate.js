export function csvCell(value) {
  let text = String(value ?? "");
  // Prevent spreadsheet formulas, including those prefixed by whitespace/control characters.
  if (/^[\s\u0000-\u001f]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text))
    text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function exportEstimate(
  plan,
  requirements,
  { timestamp = new Date().toISOString() } = {},
) {
  const rows = [
    ["ScrapLoop planning estimate"],
    ["Generated at", timestamp],
    ["Not a booking, invoice, stock reservation, or transport quote"],
    ["Material", requirements.material],
    ["Required grade", requirements.grade],
    ["Required quantity (kg)", plan.requiredKg],
    ["Selected record IDs", (requirements.selectedRecordIds || []).join(" | ")],
    [],
    [
      "Record ID",
      "Supplier",
      "Record title",
      "Allocated kg",
      "INR/kg",
      "Payout INR",
    ],
    ...plan.allocations.map((a) => [
      a.recordId,
      a.company,
      a.title,
      a.quantityKg,
      a.pricePerKg,
      a.payout,
    ]),
    [],
    ["Allocated quantity (kg)", plan.quantityKg],
    ["Shortfall (kg)", plan.shortfallKg],
    ["Material subtotal INR", plan.materialCost],
    ["Pickup assumption INR", plan.transportCost],
    ["Fee percent", plan.feePercent],
    ["Fee INR", plan.fee],
    ["Estimated delivered total INR", plan.totalCost],
    ["Comparison INR/kg", requirements.comparisonPrice],
    [
      "Comparison total INR",
      plan.complete ? plan.baselineCost : "Not compared: incomplete pool",
    ],
    [
      "Savings INR",
      plan.complete ? plan.savings : "Not compared: incomplete pool",
    ],
    ["Complete", plan.complete ? "Yes" : "No"],
    ["Explanation", plan.reason],
    [
      "Assumptions",
      "User-entered quantities and rates; pickup is an estimate. Verify grade, condition, availability and processing costs separately.",
    ],
  ];
  return (
    "\uFEFF" +
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}
