// Adapted from srushtisp09’s feat/features-2 matching explanations.
export const DEFAULT_DISTANCE_LIMIT_KM = 50;

export function haversineKm(lat1, lon1, lat2, lon2) {
  const finite = (v) =>
    typeof v === "number" && Number.isFinite(v) && v >= -90 && v <= 90;
  const finiteLon = (v) =>
    typeof v === "number" && Number.isFinite(v) && v >= -180 && v <= 180;
  if (!finite(lat1) || !finiteLon(lon1) || !finite(lat2) || !finiteLon(lon2))
    return null;
  const R = 6371,
    toRad = (d) => (d * Math.PI) / 180,
    dLat = toRad(lat2 - lat1),
    dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return (
    Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100
  );
}

export function scoreMatch(lot = {}, buyer = {}) {
  const MAX_SCORE = 20;
  const norm = (v) =>
    String(v ?? "")
      .trim()
      .toUpperCase();
  const finite = (v) => typeof v === "number" && Number.isFinite(v);
  const pos = (v) => finite(v) && v > 0;
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const fmtNum = (n) => String(Math.round(n * 100) / 100);

  const lotMatRaw = String(lot?.material ?? "").trim();
  const buyerMatRaw = String(buyer?.material ?? "").trim();
  const lotMat = norm(lotMatRaw);
  const buyerMat = norm(buyerMatRaw);
  let materialFactor;
  if (!lotMat || !buyerMat) {
    materialFactor = {
      key: "materialFit",
      label: "Material fit",
      score: null,
      maxScore: MAX_SCORE,
      known: false,
      status: "unknown",
      displayScore: "Unknown",
      sentence: "Unknown material fit because material is not recorded.",
    };
  } else if (lotMat === buyerMat) {
    materialFactor = {
      key: "materialFit",
      label: "Material fit",
      score: 20,
      maxScore: MAX_SCORE,
      known: true,
      status: "good",
      displayScore: "20 / 20",
      sentence: `Matches required ${buyerMatRaw} material.`,
    };
  } else {
    materialFactor = {
      key: "materialFit",
      label: "Material fit",
      score: 0,
      maxScore: MAX_SCORE,
      known: true,
      status: "bad",
      displayScore: "0 / 20",
      sentence: `${lotMatRaw} does not match required ${buyerMatRaw} material.`,
    };
  }

  const bLat =
    buyer?.buyerLatitude !== undefined ? buyer.buyerLatitude : buyer?.latitude;
  const bLon =
    buyer?.buyerLongitude !== undefined
      ? buyer.buyerLongitude
      : buyer?.longitude;
  const distKm = haversineKm(lot?.latitude, lot?.longitude, bLat, bLon);
  const rawLimit = buyer?.maxDistanceKm ?? buyer?.distanceLimitKm;
  const limitKm = pos(rawLimit) ? round2(rawLimit) : DEFAULT_DISTANCE_LIMIT_KM;
  let distanceFactor;
  if (distKm === null) {
    distanceFactor = {
      key: "distance",
      label: "Distance",
      score: null,
      maxScore: MAX_SCORE,
      known: false,
      status: "unknown",
      displayScore: "Unknown",
      distanceKm: null,
      limitKm,
      sentence: "Unknown distance because coordinates are not recorded.",
    };
  } else if (distKm <= limitKm) {
    const ratio = limitKm > 0 ? distKm / limitKm : 0;
    const s = Math.max(10, Math.min(20, Math.round(20 - ratio * 10)));
    distanceFactor = {
      key: "distance",
      label: "Distance",
      score: s,
      maxScore: MAX_SCORE,
      known: true,
      status: "good",
      displayScore: `${s} / 20`,
      distanceKm: distKm,
      limitKm,
      sentence: `${fmtNum(distKm)} km away, within your ${fmtNum(limitKm)} km limit.`,
    };
  } else {
    const overRatio = limitKm > 0 ? (distKm - limitKm) / limitKm : 1;
    const s = Math.max(
      0,
      Math.min(9, Math.round(10 * (1 - Math.min(1, overRatio)))),
    );
    distanceFactor = {
      key: "distance",
      label: "Distance",
      score: s,
      maxScore: MAX_SCORE,
      known: true,
      status: s >= 5 ? "partial" : "bad",
      displayScore: `${s} / 20`,
      distanceKm: distKm,
      limitKm,
      sentence: `${fmtNum(distKm)} km away, outside your ${fmtNum(limitKm)} km limit.`,
    };
  }

  const lotQty = pos(lot?.totalQuantityKg)
    ? lot.totalQuantityKg
    : pos(lot?.quantityKg)
      ? lot.quantityKg
      : pos(lot?.availableKg)
        ? lot.availableKg
        : null;
  const minOrderKg = pos(buyer?.quantityKg)
    ? buyer.quantityKg
    : pos(buyer?.requiredKg)
      ? buyer.requiredKg
      : pos(buyer?.minOrderKg)
        ? buyer.minOrderKg
        : null;
  let minOrderFactor;
  if (lotQty === null || minOrderKg === null) {
    minOrderFactor = {
      key: "minimumOrderFit",
      label: "Minimum order fit",
      score: null,
      maxScore: MAX_SCORE,
      known: false,
      status: "unknown",
      displayScore: "Unknown",
      sentence:
        "Unknown minimum order fit because quantity or minimum order is not recorded.",
    };
  } else if (lotQty >= minOrderKg) {
    minOrderFactor = {
      key: "minimumOrderFit",
      label: "Minimum order fit",
      score: 20,
      maxScore: MAX_SCORE,
      known: true,
      status: "good",
      displayScore: "20 / 20",
      sentence: `${fmtNum(lotQty)} kg available, meeting the ${fmtNum(minOrderKg)} kg minimum order.`,
    };
  } else {
    const ratio = lotQty / minOrderKg;
    const pct = Math.round(ratio * 100);
    const s = Math.max(0, Math.min(19, Math.round(ratio * 20)));
    minOrderFactor = {
      key: "minimumOrderFit",
      label: "Minimum order fit",
      score: s,
      maxScore: MAX_SCORE,
      known: true,
      status: s >= 10 ? "partial" : "bad",
      displayScore: `${s} / 20`,
      sentence: `${fmtNum(lotQty)} kg covers ${pct}% of the ${fmtNum(minOrderKg)} kg minimum order.`,
    };
  }

  const lotGradeRaw = String(lot?.grade ?? "").trim();
  const buyerGradeRaw = String(buyer?.grade ?? "").trim();
  const lotGrade = norm(lotGradeRaw);
  const buyerGrade = norm(buyerGradeRaw);
  let gradeFactor;
  if (!lotGrade || !buyerGrade) {
    gradeFactor = {
      key: "gradeFit",
      label: "Grade fit",
      score: null,
      maxScore: MAX_SCORE,
      known: false,
      status: "unknown",
      displayScore: "Unknown",
      sentence: "Unknown grade fit because grade is not recorded.",
    };
  } else if (lotGrade === buyerGrade) {
    gradeFactor = {
      key: "gradeFit",
      label: "Grade fit",
      score: 20,
      maxScore: MAX_SCORE,
      known: true,
      status: "good",
      displayScore: "20 / 20",
      sentence: `Exact ${buyerGradeRaw} grade match.`,
    };
  } else {
    gradeFactor = {
      key: "gradeFit",
      label: "Grade fit",
      score: 0,
      maxScore: MAX_SCORE,
      known: true,
      status: "bad",
      displayScore: "0 / 20",
      sentence: `Grade ${lotGradeRaw} does not match required ${buyerGradeRaw}.`,
    };
  }

  const lotPrice = pos(lot?.pricePerKg) ? round2(lot.pricePerKg) : null;
  const targetPrice = pos(buyer?.comparisonPrice)
    ? round2(buyer.comparisonPrice)
    : pos(buyer?.targetPrice)
      ? round2(buyer.targetPrice)
      : pos(buyer?.pricePerKg)
        ? round2(buyer.pricePerKg)
        : null;
  let priceFactor;
  if (lotPrice === null || targetPrice === null) {
    priceFactor = {
      key: "priceFit",
      label: "Price fit",
      score: null,
      maxScore: MAX_SCORE,
      known: false,
      status: "unknown",
      displayScore: "Unknown",
      sentence:
        "Unknown price fit because asking or comparison price is not recorded.",
    };
  } else if (lotPrice <= targetPrice) {
    const savingsRatio = (targetPrice - lotPrice) / targetPrice;
    const s = Math.max(
      12,
      Math.min(20, Math.round(12 + Math.min(1, savingsRatio * 2) * 8)),
    );
    const diff = round2(targetPrice - lotPrice);
    priceFactor = {
      key: "priceFit",
      label: "Price fit",
      score: s,
      maxScore: MAX_SCORE,
      known: true,
      status: "good",
      displayScore: `${s} / 20`,
      sentence:
        diff > 0
          ? `₹${fmtNum(lotPrice)}/kg is ₹${fmtNum(diff)}/kg below your ₹${fmtNum(targetPrice)}/kg comparison price.`
          : `₹${fmtNum(lotPrice)}/kg matches your ₹${fmtNum(targetPrice)}/kg comparison price.`,
    };
  } else {
    const overRatio = (lotPrice - targetPrice) / targetPrice;
    const s = Math.max(
      0,
      Math.min(10, Math.round(10 * (1 - Math.min(1, overRatio * 2)))),
    );
    const diff = round2(lotPrice - targetPrice);
    priceFactor = {
      key: "priceFit",
      label: "Price fit",
      score: s,
      maxScore: MAX_SCORE,
      known: true,
      status: s >= 6 ? "partial" : "bad",
      displayScore: `${s} / 20`,
      sentence: `₹${fmtNum(lotPrice)}/kg is ₹${fmtNum(diff)}/kg above your ₹${fmtNum(targetPrice)}/kg comparison price.`,
    };
  }

  const factors = [
    materialFactor,
    distanceFactor,
    minOrderFactor,
    gradeFactor,
    priceFactor,
  ];
  const factorMap = {
    materialFit: materialFactor,
    distance: distanceFactor,
    minimumOrderFit: minOrderFactor,
    gradeFit: gradeFactor,
    priceFit: priceFactor,
  };
  const knownFactors = factors.filter(
    (f) => f.known && typeof f.score === "number",
  );
  const totalScore = knownFactors.reduce((sum, f) => sum + f.score, 0);
  const maxScore = knownFactors.reduce((sum, f) => sum + f.maxScore, 0);
  return {
    totalScore,
    maxScore,
    knownCount: knownFactors.length,
    unknownCount: factors.length - knownFactors.length,
    factors,
    byKey: factorMap,
  };
}

// Fair pooled transport allocation is by quantity, independently of material price.
export function splitTransportCost(allocations, cost) {
  if (
    !Number.isFinite(cost) ||
    cost < 0 ||
    cost > 1e12 ||
    Math.abs(cost * 100 - Math.round(cost * 100)) > 0.0001
  )
    throw new Error("Enter a non-negative shared cost in whole paise.");
  if (!allocations.length)
    throw new Error("Calculate contributing lots first.");
  const weights = allocations.map((a) => {
    if (!Number.isFinite(a.quantityKg) || a.quantityKg <= 0)
      throw new Error("Each lot needs a positive quantity.");
    return BigInt(a.quantityKg.toFixed(6).replace(".", ""));
  });
  const total = weights.reduce((a, b) => a + b, 0n),
    paise = BigInt(Math.round(cost * 100));
  let running = 0n,
    assigned = 0n;
  return allocations.map((a, i) => {
    running += weights[i];
    const target = (paise * running + total / 2n) / total;
    const share = target - assigned;
    assigned = target;
    return { recordId: a.recordId, cost: Number(share) / 100 };
  });
}
export function suggestPoolLots(records, requirements, plan, isEligible) {
  const selected = new Set(requirements.selectedRecordIds || []);
  const maxPrice = Math.max(0, ...plan.allocations.map((a) => a.pricePerKg));
  return records
    .filter(
      (r) =>
        !selected.has(r.id) &&
        isEligible(r, requirements).length === 0 &&
        (plan.shortfallKg > 0 || r.pricePerKg < maxPrice),
    )
    .map((r) => ({ record: r, match: scoreMatch(r, requirements) }))
    .sort(
      (a, b) =>
        (a.match.byKey.distance.distanceKm ?? Infinity) -
          (b.match.byKey.distance.distanceKm ?? Infinity) ||
        a.record.pricePerKg - b.record.pricePerKg ||
        String(a.record.id).localeCompare(String(b.record.id)),
    )
    .slice(0, 10);
}
