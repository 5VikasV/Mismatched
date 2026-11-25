import { PROFILES, CATEGORIES } from "./evidence-data.js";
import { commission, cents } from "./trade-policy.js";
export const KG_PER_SHORT_TON = 907.18474;
const numeric = (v, name, min, max) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
    throw new Error(`${name} must be a number between ${min} and ${max}.`);
  return v;
};
export function assessEmissions(v = {}) {
  const keys = [
    "category",
    "profileId",
    "condition",
    "baseline",
    "alternative",
    "mode",
    "massTonnes",
    "adoptionPercent",
    "recoveryPercent",
  ];
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    Object.keys(v).some((k) => !keys.includes(k))
  )
    throw new Error(
      "Only assessment inputs are accepted; published factors cannot be overridden.",
    );
  if (!CATEGORIES.includes(v.category))
    throw new Error("Choose a material category.");
  const mass = numeric(
    v.massTonnes,
    "Waste mass (metric tonnes)",
    0.000001,
    1e6,
  );
  const adoption = numeric(v.adoptionPercent, "Adoption (%)", 0, 100) / 100;
  const recovery =
    numeric(v.recoveryPercent, "Successful recovery (%)", 0, 100) / 100;
  if (!["landfill", "combustion", "open-burning"].includes(v.baseline))
    throw new Error("Choose a baseline disposal pathway.");
  if (v.alternative !== "recycling")
    throw new Error("Choose the alternative treatment pathway.");
  if (!["clean", "contaminated", "hazardous", "unknown"].includes(v.condition))
    throw new Error("Choose the documented condition.");
  if (!["lifecycle", "direct-burning"].includes(v.mode))
    throw new Error("Choose an assessment boundary.");
  const profile = PROFILES.find(
    (p) => p.id === v.profileId && p.category === v.category,
  );
  const unavailable = (reason) => ({
    status: "insufficient_evidence",
    reason,
    avoidedTonnes: null,
    reductionPercent: null,
    pollutantReductionPercent: null,
    inputs: v,
  });
  if (!profile || v.condition !== "clean")
    return unavailable(
      "Insufficient published evidence for this subtype / condition. No hazard or contamination factor is inferred from a photo.",
    );
  if (v.baseline === "open-burning")
    return unavailable(
      "WARM combustion factors do not represent open burning. No applicable published open-burning profile is configured.",
    );
  const divertedTonnes = mass * adoption * recovery;
  const shortTons = (mass * 1000) / KG_PER_SHORT_TON;
  if (v.mode === "direct-burning") {
    if (v.baseline !== "combustion" || !profile.directBurn)
      return unavailable(
        "Direct-burning CO₂ benchmark is available only for supported clean plastics with a combustion baseline.",
      );
    const beforeTonnes = shortTons * profile.directBurn;
    return {
      status: "estimated",
      boundary:
        "Direct CO₂ at the original burning point only; excludes recycling, processing, replacement energy and transport. Not a net climate saving or an emission test.",
      profile,
      inputs: v,
      divertedTonnes,
      beforeTonnes,
      afterTonnes: beforeTonnes * (1 - adoption * recovery),
      avoidedTonnes: beforeTonnes * adoption * recovery,
      reductionPercent: adoption * recovery * 100,
      units: "tonnes direct CO₂",
      pollutantReductionPercent: null,
    };
  }
  const baselineFactor = profile[v.baseline],
    alternativeFactor = profile.recycling;
  const beforeTonnes = shortTons * baselineFactor;
  const afterTonnes =
    shortTons *
    ((1 - adoption * recovery) * baselineFactor +
      adoption * recovery * alternativeFactor);
  // Signed lifecycle credits are valid deltas but not a gross pollution denominator.
  const comparable =
    beforeTonnes > 0 && afterTonnes >= 0 && alternativeFactor >= 0;
  return {
    status: "estimated",
    boundary:
      "WARM net lifecycle scenario: US average treatment, transport and avoided virgin-production assumptions; not site-specific Indian emissions.",
    profile,
    inputs: v,
    divertedTonnes,
    beforeTonnes,
    afterTonnes,
    avoidedTonnes: beforeTonnes - afterTonnes,
    reductionPercent: comparable
      ? ((beforeTonnes - afterTonnes) / beforeTonnes) * 100
      : null,
    percentageNote: comparable
      ? null
      : "Percentage withheld: net lifecycle credits are not gross pollution emissions. Compare the absolute CO₂e difference.",
    units: "tonnes CO₂e (net lifecycle)",
    pollutantReductionPercent: null,
  };
}
export function businessProjection(v = {}) {
  const orders = numeric(v.orders, "Monthly orders", 0, 1e6);
  if (!Number.isInteger(orders))
    throw new Error("Monthly orders must be a whole number.");
  const materialValue = numeric(
    v.materialValue,
    "Material value per order",
    0.01,
    1e10,
  );
  if (Math.abs(materialValue * 100 - Math.round(materialValue * 100)) > 0.0001)
    throw new Error("Material value must use at most two decimal places.");
  const fee = commission(materialValue);
  const sum = (x) => {
    const value = cents(x) * BigInt(orders);
    if (value > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error("Projection exceeds supported currency precision.");
    return Number(value) / 100;
  };
  const revenue = sum(fee.fee),
    gmv = sum(materialValue);
  const fixed =
    v.fixedCosts == null
      ? null
      : numeric(v.fixedCosts, "Monthly fixed costs", 0, 1e10);
  const variable =
    v.variableCosts == null
      ? null
      : numeric(v.variableCosts, "Variable operating cost per order", 0, 1e10);
  for (const cost of [fixed, variable])
    if (cost !== null && Math.abs(cost * 100 - Math.round(cost * 100)) > 0.0001)
      throw new Error("Costs must use at most two decimal places.");
  const signed = (n) => {
    if (
      n > BigInt(Number.MAX_SAFE_INTEGER) ||
      n < BigInt(-Number.MAX_SAFE_INTEGER)
    )
      throw new Error("Projection exceeds supported currency precision.");
    return Number(n) / 100;
  };
  const contributionCents =
    variable == null ? null : cents(fee.fee) - cents(variable);
  const monthly =
    contributionCents === null ? null : contributionCents * BigInt(orders);
  const breakEven =
    fixed === null || contributionCents === null || contributionCents <= 0n
      ? null
      : Number((cents(fixed) + contributionCents - 1n) / contributionCents);
  return {
    ...fee,
    orders,
    materialValue,
    gmv,
    revenue,
    fixedCosts: fixed,
    variableCosts: variable,
    contributionPerOrder:
      contributionCents === null ? null : signed(contributionCents),
    monthlyContribution: monthly === null ? null : signed(monthly),
    operatingResult:
      monthly === null || fixed === null
        ? null
        : signed(monthly - cents(fixed)),
    breakEvenOrders: breakEven,
  };
}
export function evidenceCSV(rows) {
  const cell = (v) =>
    '"' +
    String(v ?? "Unknown")
      .replace(/^(\s*[=+@\-]|[\t\r])/, "' $&")
      .replaceAll('"', '""') +
    '"';
  return rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
