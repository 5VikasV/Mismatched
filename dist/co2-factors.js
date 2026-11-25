// srushtisp09's factor feature, reconciled to a traceable primary benchmark.
export const FACTOR_SOURCE =
  "https://www.epa.gov/system/files/documents/2023-12/warm_containers_packaging_and_non-durable_goods_materials_v16_dec.pdf";
const note =
  "US EPA WARM v16 (December 2023), Exhibit 5-11, PDF page 77. Closed-loop resin recycling benchmark; not an India-specific industrial LCA or full landfill-to-recycling comparison. Excludes ScrapLoop pickup changes.";
export const CO2_FACTORS = Object.fromEntries(
  [
    ["PP", 0.79],
    ["HDPE", 0.76],
    ["PET", 1.04],
  ].map(([key, credit]) => [
    key,
    {
      material: key,
      kgCo2PerKg: (credit * 1000) / 907.18474,
      recyclingCreditMtPerShortTon: credit,
      source: FACTOR_SOURCE,
      note,
      isEstimate: true,
    },
  ]),
);
const aliases = {
  POLYPROPYLENE: "PP",
  "HIGH-DENSITY POLYETHYLENE": "HDPE",
  "POLYETHYLENE TEREPHTHALATE": "PET",
};
export function getCo2Factor(material) {
  const name = String(material || "")
      .trim()
      .toUpperCase(),
    key = aliases[name] || name;
  const r = CO2_FACTORS[key];
  return r
    ? { ...r, key, hasFactor: true }
    : {
        material: material || "Unknown",
        hasFactor: false,
        kgCo2PerKg: null,
        source: null,
        note: "Not enough data: no applicable, traceable factor is configured for this material.",
      };
}
export const CO2_FACTOR_LIST = Object.values(CO2_FACTORS);
