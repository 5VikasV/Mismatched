export const WARM_SOURCE =
  "https://www.epa.gov/system/files/documents/2023-12/warm_containers_packaging_and_non-durable_goods_materials_v16_dec.pdf";
export const REVIEWED_AT = "2026-11-25";
export const CATEGORIES = [
  "plastic",
  "rubber",
  "glass",
  "metal",
  "e-waste",
  "paper",
  "cardboard",
  "textile",
  "organic/agricultural",
  "mixed/unknown",
];
// Curated profiles only. Units: metric tonnes CO2e per US short ton of waste.
// Negative recycling factors are net lifecycle credits, never gross emissions.
export const PROFILES = [
  {
    id: "pp",
    category: "plastic",
    label: "Clean PP — closed-loop recycling",
    recycling: -0.79,
    landfill: 0.02,
    combustion: 1.29,
    directBurn: 2.79,
    exhibit: "5-3, 5-17; PDF pages 73, 79",
  },
  {
    id: "hdpe",
    category: "plastic",
    label: "Clean HDPE — closed-loop recycling",
    recycling: -0.76,
    landfill: 0.02,
    combustion: 1.29,
    directBurn: 2.79,
    exhibit: "5-3, 5-17; PDF pages 73, 79",
  },
  {
    id: "pet",
    category: "plastic",
    label: "Clean PET — closed-loop recycling",
    recycling: -1.04,
    landfill: 0.02,
    combustion: 1.24,
    directBurn: 2.04,
    exhibit: "5-3, 5-17; PDF pages 73, 79",
  },
  {
    id: "container-glass",
    category: "glass",
    label: "Bottles / jars only — container glass",
    recycling: -0.28,
    landfill: 0.02,
    combustion: 0.03,
    exhibit: "1-4; PDF page 6",
  },
  {
    id: "aluminum-cans",
    category: "metal",
    label: "Aluminum cans only",
    recycling: -9.13,
    landfill: 0.02,
    combustion: 0.03,
    exhibit: "2-7; PDF page 20",
  },
  {
    id: "steel-cans",
    category: "metal",
    label: "Steel cans only",
    recycling: -1.83,
    landfill: 0.02,
    combustion: -1.59,
    exhibit: "2-7; PDF page 20",
  },
].map((p) => ({
  ...p,
  source: WARM_SOURCE,
  version: "EPA WARM v16 · December 2023",
  units: "MT CO2e / US short ton",
  geography:
    "US model; illustrative benchmark, not an India-specific inventory",
}));
export const CASES = [
  {
    id: "vapi-ambuja",
    region: "INDIA · GUJARAT",
    period:
      "2012 stock and dispatch records · CPCB corroboration published May 2017",
    title: "Stockpiled plastic meets an industrial fuel demand.",
    from: "Vapi paper mills · stock recorded at Vapi Paper Mills Ltd premises",
    material: "Non-recyclable plastic → alternative kiln fuel",
    to: "Ambuja Cements · Kodinar unit",
    figures: [
      "15,341.09 tonnes stockpiled at Vapi Paper Mills Ltd premises by November 2012",
      "30,873 tonnes dispatched from Vapi paper mills collectively by November 2012",
      "154,018 tonnes co-processed during 2012–2016 (CPCB)",
    ],
    story:
      "A 6 April 2011 agreement between Ambuja and the Gujarat Paper Mills Association established an outlet for paper-mill plastic. The 2012 records show stockpiles alongside regional industrial utilisation.",
    limit:
      "The dispatch total covers multiple paper mills, not Vapi Paper Mills Ltd alone. Stockpiling is not proof of illegal dumping or that every tonne met kiln specifications. Payment terms and buyer purchase savings are unpublished. This was alternative fuel, not plastic recycled into new plastic, and does not prove a specific missed same-year purchase.",
    source: "https://gcpcenvis.nic.in/Monographs/cpwastepapersector.pdf",
    publisher: "Gujarat Cleaner Production Centre · Paper-sector report",
    references: [
      {
        url: "https://cpcb.nic.in/uploads/plasticwaste/co-processing_guidelines_final_23.05.17.pdf",
        label: "CPCB · May 2017 guidelines, Case Study 2, printed page 18",
      },
    ],
  },
  {
    id: "hi-tech-carbon",
    region: "INDIA · TAMIL NADU",
    period:
      "First sale 25 February 2014 · results to 7 November 2014 · published February 2015",
    title: "From paying for landfill to selling a useful input.",
    from: "Hi-Tech Carbon · Gummidipoondi",
    material: "Lime sludge · industrial residue",
    to: "Nearby fly-ash brick manufacturers · unnamed",
    figures: [
      "₹1,250 / tonne former landfill disposal cost",
      "₹167 / tonne agreed selling price",
      "425.330 tonnes sold by 7 November 2014",
      "₹9.58 lakh reported annual tangible benefit",
    ],
    story:
      "The plant generated 40–50 tonnes of lime sludge monthly. Nearby fly-ash brick manufacturers 10–20 km away provided a commercially feasible outlet; the first sale took place on 25 February 2014.",
    limit:
      "Lime sludge is outside the metal, glass, plastic and e-waste categories. Successful brick buyers are not named. ₹9.58 lakh is the reported annual seller benefit, not sales revenue for the February–November period or buyer procurement savings. More distant cement options were explored but were not commercially feasible; no fully named same-year missed purchase is established.",
    source:
      "https://www.cms.adityabirla.com/uploads/Abg_hi_tech_carbon_Machinist_c0ffdb5e50.pdf",
    publisher: "Aditya Birla Group · The Machinist, February 2015, pages 24–25",
  },
  {
    id: "ntpc",
    region: "INDIA",
    period: "FY 2024–25 · report as at 31 Oct 2025",
    title: "Crop residue has an industrial buyer.",
    from: "Agricultural residue",
    material: "Processed biomass",
    to: "NTPC power stations",
    figures: ["703,466.12 metric tonnes consumed", "FY 2024–25"],
    story:
      "NTPC links crop-residue burning in Punjab and Haryana with air pollution, while reporting substantial biomass consumption for co-firing.",
    limit:
      "Evidence of demand for processed biomass. Raw straw still needs processing and buyer specifications. No actual purchase expenditure is disclosed here; this does not identify a paired supplier that burned a particular purchased surplus lot.",
    source:
      "https://ntpc.co.in/sites/default/files/2025-12/ESG%20PPT%20NTPC%2031.10.2025_R1.pdf",
    publisher: "NTPC · ESG presentation, page 17",
  },
  {
    id: "banners",
    region: "SOUTH AFRICA",
    period: "2018 case study · connection established 2015",
    title: "Discarded banners replace new fabric.",
    from: "Scan Display",
    material: "Polytwirl banners",
    to: "Sealand Gear",
    figures: [
      "2 tonnes reused / year",
      "ZAR 270,000 buyer savings / year",
      "ZAR 900 disposal savings / year",
    ],
    story:
      "Used event banners became bag-making inputs, replacing Sealand Gear’s purchases of new polytwirl.",
    limit:
      "Historical estimates reported by GreenCape, in South African rand. Not current prices, guaranteed savings or ScrapLoop transactions.",
    source:
      "https://www.greencape.co.za/assets/Uploads/GC3-20181005-WISPCaseStudy-BannerstoBags-Web.pdf",
    publisher: "GreenCape · Banners to Bags, Case Study 011",
  },
  {
    id: "utilities",
    region: "UNITED KINGDOM",
    period:
      "Completed example in a 13-month capital-delivery study · publication date not stated",
    title: "Unused construction stock finds its next site.",
    from: "United Utilities project resources",
    material: "Ducts, fencing, manhole rings",
    to: "Mere Brow WWTP / Station Road",
    figures: [
      "£22,796 avoided purchases",
      "30 tonnes landfill avoided",
      "97 tonnes CO₂ avoided (reported)",
    ],
    story:
      "The facilitator reports a completed exchange of unused construction resources between project needs.",
    limit:
      "Operator-reported case, not independently audited by ScrapLoop. These completed-example results are separate from the larger programme’s potential savings.",
    source:
      "https://international-synergies.com/project/water-sector-innovation/",
    publisher: "International Synergies · Water-sector innovation",
  },
  {
    id: "kalundborg",
    region: "DENMARK",
    period: "Historical collaboration · now ceased",
    title: "A refinery’s wasted gas dried plasterboard.",
    from: "Kalundborg refinery / Asnæs",
    material: "Surplus gas / industrial gypsum",
    to: "Saint-Gobain Gyproc",
    figures: [
      "Formerly wasted refinery gas reused",
      "Industrial gypsum replaced natural gypsum",
    ],
    story:
      "Gyproc used refinery gas for drying and power-station gypsum in production.",
    limit:
      "The operator says both collaborations ceased after operational changes. No quantified purchase savings are supplied. A historical precedent, not an available listing.",
    source: "https://www.symbiosis.dk/en/saint-gobain-gyproc/",
    publisher: "Kalundborg Symbiosis · Gyproc partner history",
  },
];
export function evidenceRegistry() {
  return {
    reviewedAt: REVIEWED_AT,
    cases: CASES,
    categories: CATEGORIES,
    profiles: PROFILES,
    boundary:
      "Published precedents are not ScrapLoop outcomes. Projections are not delivered results.",
  };
}
