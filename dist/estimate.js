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
    ["Required quantity (tonnes)", plan.requiredKg / 1000],
    ["Quantity category", plan.quantityBand],
    ["Commission policy", plan.policyVersion],
    ["Selected record IDs", (requirements.selectedRecordIds || []).join(" | ")],
    [],
    [
      "Record ID",
      "Supplier",
      "Record title",
      "Allocated kg",
      "INR/kg",
      "Gross material INR",
      "Seller commission INR",
      "Seller transport INR",
      "Seller net INR",
      "Vehicle provider",
      "Transport payer",
      "Transport cost INR",
    ],
    ...plan.allocations.map((a) => [
      a.recordId,
      a.company,
      a.title,
      a.quantityKg,
      a.pricePerKg,
      a.payout,
      a.sellerFee,
      a.sellerTransport,
      a.sellerNet,
      a.pickup?.provider || "Unknown",
      a.pickup?.payer || "Unknown",
      a.pickup?.cost ?? "Unknown",
    ]),
    [],
    ["Allocated quantity (kg)", plan.quantityKg],
    ["Shortfall (kg)", plan.shortfallKg],
    ["Material subtotal INR", plan.materialCost],
    ["Pickup assumption INR", plan.transportCost],
    ["Fee percent", plan.feePercent],
    ["Fee INR", plan.fee],
    ["Buyer commission INR", plan.buyerFee],
    ["Seller commission INR", plan.sellerFee],
    ["Buyer transport INR", plan.buyerTransport],
    ["Seller transport INR", plan.sellerTransport],
    ["Seller net proceeds INR", plan.sellerNet],
    ["Transport decisions complete", plan.transportComplete ? "Yes" : "No"],
    [
      "Estimated delivered total INR",
      plan.transportComplete ? plan.totalCost : "Pending transport decisions",
    ],
    ["Comparison INR/kg", requirements.comparisonPrice],
    [
      "Comparison total INR",
      plan.complete ? plan.baselineCost : "Not compared: incomplete pool",
    ],
    [
      "Savings INR",
      plan.savings !== null
        ? plan.savings
        : "Not compared: incomplete pool or transport",
    ],
    ["Complete", plan.complete ? "Yes" : "No"],
    ["Explanation", plan.reason],
    [
      "Assumptions",
      "User-entered quantities and rates; pickup costs are user-proposed. Taxes and payment-processing charges are excluded. Fees are projected, not received revenue. Verify grade, condition, availability and processing costs separately.",
    ],
  ];
  return (
    "\uFEFF" +
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}
