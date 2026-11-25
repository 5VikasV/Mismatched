/**
 * Estimated CO2e avoided factors per material (kg CO2e avoided per 1 kg of scrap diverted from landfill / virgin substitution).
 *
 * IMPORTANT:
 * - Every factor in this file is a planning estimate, not a certified carbon credit or verified lifecycle audit.
 * - Do not invent numbers where a reliable single per-kg factor is missing; leave kgCo2PerKg as null with a clear TODO placeholder
 *   so the UI displays "Not enough data".
 */

export const CO2_FACTORS = {
  PP: {
    material: 'PP',
    label: 'Polypropylene (PP)',
    kgCo2PerKg: 1.35,
    source: 'PlasticsEurope Eco-profiles & US EPA WARM Model (Recycled vs Virgin PP)',
    note: 'Estimate only: approximate cradle-to-gate avoided emissions when clean PP scrap substitutes virgin polypropylene resin.',
    isEstimate: true,
    todo: null,
  },
  HDPE: {
    material: 'HDPE',
    label: 'High-Density Polyethylene (HDPE)',
    kgCo2PerKg: 1.4,
    source: 'US EPA WARM Model & PlasticsEurope Eco-profiles (Recycled vs Virgin HDPE)',
    note: 'Estimate only: approximate lifecycle emissions avoided from mechanical HDPE reprocessing vs virgin resin.',
    isEstimate: true,
    todo: null,
  },
  PET: {
    material: 'PET',
    label: 'Polyethylene Terephthalate (PET)',
    kgCo2PerKg: 1.7,
    source: 'UK DESNZ / DEFRA GHG Conversion Factors & US EPA WARM Model',
    note: 'Estimate only: approximate avoided emissions for clean PET flake recovery substituting virgin polymer.',
    isEstimate: true,
    todo: null,
  },
  PLASTIC: {
    material: 'Plastic',
    label: 'Plastic (General polymer)',
    kgCo2PerKg: 1.38,
    source: 'UK DESNZ / DEFRA GHG Conversion Factors (Average Plastics Recycling)',
    note: 'Estimate only: general polymer recycling average; use resin-specific factors (PP, HDPE, PET) where grade is known.',
    isEstimate: true,
    todo: null,
  },
  ALUMINIUM: {
    material: 'Aluminium',
    label: 'Aluminium',
    kgCo2PerKg: 8.1,
    source: 'International Aluminium Institute (IAI) Global Life Cycle Inventory',
    note: 'Estimate only: secondary aluminium remelting vs primary smelting; actual avoided CO2e depends heavily on grid electricity mix.',
    isEstimate: true,
    todo: null,
  },
  STEEL: {
    material: 'Steel',
    label: 'Steel',
    kgCo2PerKg: 1.5,
    source: 'World Steel Association (worldsteel) Life Cycle Inventory Study',
    note: 'Estimate only: electric arc furnace steel scrap remelting vs primary blast-furnace steel production.',
    isEstimate: true,
    todo: null,
  },
  COPPER: {
    material: 'Copper',
    label: 'Copper',
    kgCo2PerKg: 2.8,
    source: 'International Copper Alliance (ICA) Copper Environmental Profile',
    note: 'Estimate only: secondary copper recovery vs primary ore extraction and refining.',
    isEstimate: true,
    todo: null,
  },
  CARDBOARD: {
    material: 'Cardboard',
    label: 'Cardboard / Corrugated Paper',
    kgCo2PerKg: 0.9,
    source: 'UK DESNZ / DEFRA GHG Conversion Factors (Paper and Board)',
    note: 'Estimate only: net avoided emissions from repulping recovered corrugated cardboard vs landfill and virgin pulp.',
    isEstimate: true,
    todo: null,
  },
  GLASS: {
    material: 'Glass',
    label: 'Glass Cullet',
    kgCo2PerKg: 0.31,
    source: 'FEVE / US EPA WARM Model (Glass Cullet Remelting)',
    note: 'Estimate only: furnace fuel and raw carbonate decomposition savings from remelting clean glass cullet.',
    isEstimate: true,
    todo: null,
  },
  'E-WASTE': {
    material: 'E-waste',
    label: 'E-waste (Mixed Electronics)',
    // TODO: Add verified kg CO2e/kg factor per e-waste category once material assay fraction and recovery process are recorded.
    kgCo2PerKg: null,
    source: 'TODO: Source pending — CPCB / India-specific e-waste dismantling LCA factor not yet configured',
    note: 'Estimate unavailable (Not enough data): mixed e-waste varies widely by PCB, copper, aluminium, glass, and plastic composition.',
    isEstimate: true,
    todo: 'TODO: Add verified kg CO2e/kg factor per e-waste stream once material composition is specified.',
  },
  TEXTILE: {
    material: 'Textile',
    label: 'Textile Offcuts',
    // TODO: Add verified kg CO2e/kg factor once fibre blend (cotton, polyester, viscose) and mechanical/chemical recovery route are known.
    kgCo2PerKg: null,
    source: 'TODO: Source pending — Fibre-specific textile recycling LCA factor not yet configured',
    note: 'Estimate unavailable (Not enough data): avoided emissions depend on cotton vs synthetic blend and shoddy/yarn recovery process.',
    isEstimate: true,
    todo: 'TODO: Add verified kg CO2e/kg factor for sorted cotton and synthetic textile offcuts.',
  },
  RUBBER: {
    material: 'Rubber',
    label: 'Rubber / Tyres',
    // TODO: Add verified kg CO2e/kg factor once crumb rubber, devulcanisation, or reclaim pathway is specified.
    kgCo2PerKg: null,
    source: 'TODO: Source pending — Industrial rubber and end-of-life tyre recovery LCA factor not yet configured',
    note: 'Estimate unavailable (Not enough data): emission savings differ substantially between crumb grinding and devulcanisation.',
    isEstimate: true,
    todo: 'TODO: Add verified kg CO2e/kg factor once rubber recovery pathway is specified.',
  },
};

const MATERIAL_ALIASES = {
  PP: 'PP',
  POLYPROPYLENE: 'PP',
  HDPE: 'HDPE',
  'HIGH-DENSITY POLYETHYLENE': 'HDPE',
  PET: 'PET',
  'POLYETHYLENE TEREPHTHALATE': 'PET',
  PLASTIC: 'PLASTIC',
  PLASTICS: 'PLASTIC',
  POLYMER: 'PLASTIC',
  ALUMINIUM: 'ALUMINIUM',
  ALUMINUM: 'ALUMINIUM',
  AL: 'ALUMINIUM',
  STEEL: 'STEEL',
  'MILD STEEL': 'STEEL',
  'STAINLESS STEEL': 'STEEL',
  IRON: 'STEEL',
  COPPER: 'COPPER',
  CU: 'COPPER',
  CARDBOARD: 'CARDBOARD',
  PAPER: 'CARDBOARD',
  CORRUGATED: 'CARDBOARD',
  GLASS: 'GLASS',
  CULLET: 'GLASS',
  'E-WASTE': 'E-WASTE',
  EWASTE: 'E-WASTE',
  'E WASTE': 'E-WASTE',
  ELECTRONICS: 'E-WASTE',
  TEXTILE: 'TEXTILE',
  TEXTILES: 'TEXTILE',
  FABRIC: 'TEXTILE',
  RUBBER: 'RUBBER',
  TYRE: 'RUBBER',
  TYRES: 'RUBBER',
  TIRE: 'RUBBER',
  TIRES: 'RUBBER',
};

export const CO2_FACTOR_LIST = Object.values(CO2_FACTORS);

export function getCo2Factor(materialName, factorsMap = CO2_FACTORS) {
  const raw = String(materialName ?? '').trim();
  const upper = raw.toUpperCase();
  const canonicalKey = (factorsMap && factorsMap[upper]) ? upper : (MATERIAL_ALIASES[upper] || upper);
  const entry = factorsMap && canonicalKey ? (factorsMap[canonicalKey] || factorsMap[raw]) : null;
  if (entry && typeof entry.kgCo2PerKg === 'number' && Number.isFinite(entry.kgCo2PerKg) && entry.kgCo2PerKg >= 0) {
    return {
      ...entry,
      key: canonicalKey,
      factor: entry.kgCo2PerKg,
      kgCo2ePerKg: entry.kgCo2PerKg,
      hasFactor: true,
      isEstimate: true,
    };
  }
  if (entry) {
    return {
      ...entry,
      key: canonicalKey,
      kgCo2PerKg: null,
      factor: null,
      kgCo2ePerKg: null,
      hasFactor: false,
      isEstimate: true,
      todo: entry.todo || `TODO: Add verified kg CO2e/kg factor for ${entry.material || raw}.`,
    };
  }
  return {
    key: upper || 'UNKNOWN',
    material: raw || 'Unknown material',
    label: raw || 'Unknown material',
    kgCo2PerKg: null,
    factor: null,
    kgCo2ePerKg: null,
    hasFactor: false,
    isEstimate: true,
    source: `TODO: Source pending — no CO2 factor configured for ${raw || 'unknown material'}`,
    note: 'Estimate unavailable (Not enough data): no verified CO2 factor is configured for this material.',
    todo: `TODO: Add verified kg CO2e/kg factor and source for ${raw || 'unknown material'}.`,
  };
}
