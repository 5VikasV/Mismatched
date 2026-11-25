import { haversineKm } from "./matching.js";
import { settleAllocations, quantityBand } from "./trade-policy.js";
const norm = (v) =>
  String(v ?? "")
    .trim()
    .toUpperCase();
const finite = (v) => typeof v === "number" && Number.isFinite(v);
const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const units = (n) => BigInt(n.toFixed(6).replace(".", ""));
const kg = (n) => Number(n) / 1e6;
const moneySafe = (n) =>
  Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER / 100;
export function eligibilityReasons(record, requirements = {}) {
  const reasons = [];
  if (record.confirmed !== true) reasons.push("Record is not confirmed");
  for (const [key, label] of [
    ["material", "Material"],
    ["grade", "Grade"],
    ["condition", "Condition"],
    ["quantityKg", "Quantity"],
    ["pricePerKg", "Price"],
  ]) {
    if (record.fieldReview && record.fieldReview[key] !== "user_confirmed")
      reasons.push(`${label} needs confirmation`);
  }
  if (!norm(record.material)) reasons.push("Material unknown");
  else if (norm(record.material) !== norm(requirements.material))
    reasons.push("Material does not match");
  if (!norm(record.grade)) reasons.push("Grade unknown");
  else if (norm(record.grade) !== norm(requirements.grade))
    reasons.push("Grade does not match");
  if (norm(record.condition) !== "CLEAN")
    reasons.push(
      "Condition is unknown, mixed, or unsuitable; confirmed clean material required",
    );
  if (
    !finite(record.quantityKg) ||
    record.quantityKg <= 0 ||
    record.quantityKg > 1e12
  )
    reasons.push("Positive quantity required (up to 1 trillion kg)");
  if (
    !finite(record.pricePerKg) ||
    record.pricePerKg <= 0 ||
    record.pricePerKg > 1e12
  )
    reasons.push("Positive price required (up to ₹1 trillion/kg)");
  const distance = haversineKm(
    record.latitude,
    record.longitude,
    requirements.buyerLatitude,
    requirements.buyerLongitude,
  );
  if (distance !== null && distance > 50)
    reasons.push("Outside the 50 km straight-line matching radius");
  return reasons;
}
export function planPool(records, requirements = {}) {
  const {
    material,
    grade,
    quantityKg,
    comparisonPrice,
    pickups = [],
    selectedRecordIds,
  } = requirements;
  const p = {
    viable: false,
    complete: false,
    reason: "",
    allocations: [],
    quantityKg: 0,
    requiredKg: finite(quantityKg) ? quantityKg : 0,
    materialCost: 0,
    transportCost: 0,
    feePercent: 0,
    transportComplete: false,
    transportErrors: [],
    quantityBand: quantityBand(quantityKg)?.label || null,
    fee: 0,
    totalCost: 0,
    baselineCost: 0,
    savings: null,
    excludedCount: 0,
    shortfallKg: finite(quantityKg) ? quantityKg : 0,
    exclusions: [],
  };
  if (!norm(material) || !norm(grade))
    return {
      ...p,
      reason:
        "Enter a material and confirmed grade to find compatible research records.",
    };
  if (
    ![quantityKg, comparisonPrice].every(
      (v) => finite(v) && v > 0 && v <= 1e12,
    ) ||
    units(quantityKg) <= 0n
  )
    return {
      ...p,
      reason:
        "Enter positive required quantity and comparison price. Quantity precision is six decimals.",
    };
  if (
    selectedRecordIds !== undefined &&
    (!Array.isArray(selectedRecordIds) ||
      selectedRecordIds.some((id) => typeof id !== "string"))
  )
    return {
      ...p,
      reason: "Select material records using a list of record IDs.",
    };
  const selected =
      selectedRecordIds === undefined ? null : new Set(selectedRecordIds),
    seen = new Set(),
    eligible = [];
  for (const r of records) {
    const reasons = eligibilityReasons(r, requirements);
    if (!r.id || seen.has(r.id)) reasons.push("Missing or duplicate record ID");
    seen.add(r.id);
    if (selected && !selected.has(r.id)) reasons.push("Not selected");
    if (reasons.length) p.exclusions.push({ recordId: r.id, reasons });
    else eligible.push(r);
  }
  p.excludedCount = p.exclusions.length;
  eligible.sort(
    (a, b) =>
      a.pricePerKg - b.pricePerKg ||
      b.quantityKg - a.quantityKg ||
      String(a.id).localeCompare(String(b.id)),
  );
  let needed = units(quantityKg);
  const required = needed;
  p.requiredKg = kg(required);
  for (const r of eligible) {
    if (needed === 0n) break;
    const available = units(r.quantityKg);
    const q = available < needed ? available : needed;
    if (q <= 0n) continue;
    const payout = kg(q) * r.pricePerKg;
    if (!moneySafe(payout))
      return {
        ...p,
        allocations: [],
        reason:
          "This estimate exceeds supported currency precision. Use smaller lots or rates.",
      };
    p.allocations.push({
      recordId: r.id,
      title: r.title,
      company: r.company || "Company not recorded",
      quantityKg: kg(q),
      pricePerKg: r.pricePerKg,
      payout: round(payout),
    });
    needed -= q;
  }
  p.quantityKg = kg(required - needed);
  p.shortfallKg = kg(needed);
  p.materialCost = round(p.allocations.reduce((s, a) => s + a.payout, 0));
  try {
    Object.assign(p, settleAllocations(p.allocations, pickups));
  } catch (error) {
    return { ...p, complete: false, viable: false, reason: error.message };
  }
  p.baselineCost = round(p.requiredKg * comparisonPrice);
  if (![p.materialCost, p.fee, p.totalCost, p.baselineCost].every(moneySafe))
    return {
      ...p,
      viable: false,
      complete: false,
      savings: null,
      reason:
        "This estimate exceeds supported currency precision. Use smaller lots or rates.",
    };
  p.complete = needed === 0n;
  if (!p.complete)
    return {
      ...p,
      reason: `${p.quantityKg} kg of compatible material recorded; ${p.shortfallKg} kg still needed. Complete the pool before comparing savings.`,
    };
  if (!p.transportComplete)
    return {
      ...p,
      reason:
        p.transportErrors.join(" ") ||
        "Choose transport responsibilities for each pickup.",
    };
  p.savings = round(p.baselineCost - p.totalCost);
  p.viable = p.savings > 0;
  p.reason = p.viable
    ? "The recorded quantities meet this requirement at a lower estimated delivered cost."
    : "The estimated delivered cost meets or exceeds your comparison cost.";
  return p;
}
