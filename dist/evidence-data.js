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
    "id": "ntpc-fly-ash",
    "region": "INDIA · UTTAR PRADESH → ASSAM / ACC PLANTS",
    "period": "Historic shipment · FY 2019–20 utilisation · ASH TRACK launch February 2018",
    "title": "NTPC fly ash becomes a cement input.",
    "from": "NTPC · Rihand power plant",
    "material": "Conditioned fly ash",
    "to": "Dalmia Cement (Bharat), Nagaon · ACC plants",
    "figures": [
      "3,834 tonnes sent to Dalmia Cement (Bharat), Nagaon, Assam",
      "44.33 million tonnes reportedly utilised productively in FY 2019–20 (overall figure, not this shipment)",
      "ASH TRACK launched February 2018 · 100 km / 300 km search radii",
      "63% utilisation reported at ASH TRACK launch · 100% target"
    ],
    "story": "Earlier railway rakes went to ACC plants at Tikaria (Uttar Pradesh), Kymore (Madhya Pradesh) and Ropar (Punjab). Fly ash is a by-product of coal-fired power generation.",
    "connection": "NTPC arranged cement-maker tie-ups and used Indian Railways. ASH TRACK provides a separate government interface between plants and ash users: users can apply online, with SMS notifications to the applicant and plant. This does not establish that ASH TRACK arranged this particular shipment.",
    "limit": "Historical figures from the supplied research, not current availability. The 44.33 million-tonne figure is not the Rihand–Dalmia shipment volume. No public fly-ash price is given. ASH TRACK launch figures describe 2018, not present utilisation. These records do not prove a specific dumped batch was later purchased.",
    "source": "https://www.constructionworld.in/gold/cement-news/ntpc-starts-finding-buyers-for-its-fly-ash-in-cement-firms/24469",
    "publisher": "Construction World · NTPC fly-ash supply report",
    "references": [
      {
        "url": "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1520080&lang=2&reg=48",
        "label": "Ministry of Power / PIB · ASH TRACK launch, 9 February 2018"
      }
    ]
  },
  {
    "id": "kpcl-raichur",
    "region": "INDIA · RAICHUR, KARNATAKA",
    "period": "Agreement reported 11 September 2006 · historical lifting and generation figures",
    "title": "Raichur fly ash connects power generation to cement.",
    "from": "Karnataka Power Corporation · Raichur Thermal Power Station",
    "material": "Fly ash",
    "to": "ACC Shahabad · ARV Cooperative Society (ACC, Rajashree, Vasavadatta)",
    "figures": [
      "₹130 crore proposed silo and rail-link project, funded by the cement companies",
      "93 companies permitted to lift fly ash (historical report)",
      "100–200 tonnes per company; allocation period unspecified",
      "About 1.5 million tonnes generated annually (older Wikipedia figure)"
    ],
    "story": "The cement companies use ash for pozzolana cement. Other users make bricks, tiles and paving slabs. The proposed infrastructure covered vacuum silos and a link to the Chennai–Mumbai railway line.",
    "connection": "A signed KPCL–cement-company agreement, followed by permissions and an auction reported once every three years for other users. Factory trucks collect the ash from the power station.",
    "limit": "The agreement is from 2006. ₹130 crore is a proposed project cost, not proven completed expenditure or procurement savings. The annual generation estimate is an older Wikipedia figure in the supplied document; it is not current measured output. Do not annualise the 100–200 tonne allocation without a stated period. The research gives no current fly-ash price; check the latest CEA report before using these figures as current pitch data.",
    "source": "https://www.cemnet.com/News/story/140796/power-plant-signs-agreement-with-cement-companies.html",
    "publisher": "CemNet · Power plant agreement, 11 September 2006",
    "references": [
      {
        "url": "https://www.deccanherald.com/india/karnataka/fly-ash-residue-turns-revenue-703686.html",
        "label": "Deccan Herald · Fly ash residue turns revenue source for RTPS"
      },
      {
        "url": "https://en.wikipedia.org/wiki/Raichur_Thermal_Power_Station",
        "label": "Wikipedia · older generation estimate referenced in supplied research"
      }
    ]
  },
  {
    "id": "mrpl-fact",
    "region": "INDIA · MANGALORE, KARNATAKA → KERALA",
    "period": "Purchase orders: August 2022 / April 2023 · separate price reference: 16 March 2020",
    "title": "Refinery sulphur supplies fertiliser manufacturing.",
    "from": "Mangalore Refinery and Petrochemicals Ltd (MRPL)",
    "material": "Sulphur recovered from crude-oil refining",
    "to": "Fertilisers and Chemicals Travancore (FACT)",
    "figures": [
      "₹20,79,55,974 sulphur purchase order · August 2022 (about ₹20.8 crore)",
      "₹42,26,68,695 sulphur purchase order · April 2023 (about ₹42.3 crore)",
      "₹5,900 / tonne molten or pellet sulphur · 16 March 2020 price reference",
      "₹5,400 / tonne lump sulphur · 16 March 2020 price reference; prices exclude 5% GST"
    ],
    "story": "FACT’s published nominated-purchase lists identify MRPL as the sulphur supplier. MRPL also describes itself as India’s largest exporter of ATF, fuel oil and sulphur in the supplied research.",
    "connection": "Direct nominated procurement between two public-sector companies. The April 2023 purchase list explicitly refers to a long-term agreement with MRPL; this was not an online-marketplace match.",
    "limit": "Order values are published purchase commitments, not evidence of completed deliveries, payment or savings. The 2020 price references are historical figures reproduced from the supplied document, not current quotations or the prices of the 2022/2023 orders. Do not divide these order values by the old rates to infer tonnage. Sulphur is a refinery by-product; the records do not establish dumping of this material.",
    "source": "https://fact.co.in/images/upload/Nominated-Purchase_August-2022_628.pdf",
    "publisher": "FACT · Nominated purchase orders, August 2022",
    "references": [
      {
        "url": "https://fact.co.in/images/upload/Nominated-Purchase_April_2023_979.pdf",
        "label": "FACT · April 2023 purchase order and long-term agreement"
      },
      {
        "url": "https://www.mrpl.co.in/",
        "label": "MRPL · official website (2020 price reference documented in supplied research)"
      }
    ]
  },
  {
    "id": "mahindra-mjunction",
    "region": "INDIA · BUYERS FROM SEVEN STATES",
    "period": "FY 2019 · historical e-auction case",
    "title": "Mahindra component makers sell steel scrap online.",
    "from": "12 Mahindra & Mahindra auto-component manufacturers",
    "material": "Automotive steel scrap",
    "to": "Steel scrap buyers across seven states · winning buyers unnamed",
    "figures": [
      "Over 9,000 tonnes of scrap sold in FY 2019",
      "12 M&M component manufacturers",
      "Buyers participated from 7 states"
    ],
    "story": "Participants came from Gujarat, Haryana, Madhya Pradesh, Maharashtra, Punjab, Uttar Pradesh and Uttarakhand. The operator reported market-price discovery and higher realisations than offline selling, without publishing a percentage increase.",
    "connection": "mjunction moved the sale from offline dealing to B2B e-auctions. It researched buyers, provided pan-India exposure and buyer training, and supports payment and material lifting. The platform is promoted jointly by SAIL and Tata Steel.",
    "limit": "The winning buyer companies are not named publicly. This demonstrates the connection method and historical auction volume, not that these suppliers dumped this scrap. Platform-wide buyer counts and the separate KPTL case are not M&M auction results; no savings percentage or purchase price is supplied.",
    "source": "https://www.mjunction.in/mjunction-conducts-e-auction-of-auto-scrap-for-mm%20/",
    "publisher": "mjunction · operator’s M&M e-auction release, May 2019",
    "references": [
      {
        "url": "https://www.autocarpro.in/news-national/mjunction-sells-9-000-tonnes-of-mahindras-automotive-steel-scrap-42936?amp=1",
        "label": "Autocar Professional · M&M scrap-auction report, 8 May 2019"
      }
    ]
  }
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
