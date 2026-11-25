# ScrapLoop: pitch evidence and numbers

Reviewed 25 November 2026. Open `/workspace#evidence` for case studies, calculator, business scenario and browser printing. `/workspace#sources` redirects there. Setup remains in README; directory import and provenance stay in Facility directory.

## Three types of evidence

1. **Published precedent:** another organisation’s reported outcomes, clearly dated and attributed. Never count them as ScrapLoop results.
2. **Project measurement:** read `reports/model/latest.json`. MobileNetV3 Small / ImageNet transfer learning, TrashNet fine-tuning; 1,778 train / 367 validation / 376 test images. Rounded held-out accuracy 89.1%, macro-F1 86.6%. Six household-object categories; industrial quality, purity, hazardous status, weight and price are not validated. Dataset labels are not factory expert labels.
3. **Conditional projection:** user-supplied waste mass, adoption, successful recovery, orders and costs. No confirmed delivery or collected revenue is implied. Do not multiply classifier accuracy by climate savings.

## Real industrial precedents

| Case                                   | Reported figure                                                                                        | Scope and evidence                                                                                                                                                                                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| India: NTPC processed biomass          | 703,466.12 metric tonnes consumed in FY2024–25                                                         | [NTPC ESG presentation as at 31 Oct 2025, slide 17](https://ntpc.co.in/sites/default/files/2025-12/ESG%20PPT%20NTPC%2031.10.2025_R1.pdf). Establishes industrial demand and crop-burning context, not a specific paired surplus supplier or purchase expenditure. Raw residue must meet processing/specification requirements. |
| Scan Display → Sealand Gear            | 2 tonnes of banners/year; ZAR270,000/year buyer raw-material savings; ZAR900/year disposal-fee savings | [GreenCape, Case Study 011, 2018](https://www.greencape.co.za/assets/Uploads/GC3-20181005-WISPCaseStudy-BannerstoBags-Web.pdf). Historical estimates, not present market prices.                                                                                                                                               |
| United Utilities construction exchange | £22,796 avoided purchases; 30 tonnes landfill avoided; 97 tonnes CO2 avoided                           | [International Synergies project account](https://international-synergies.com/project/water-sector-innovation/). Operator-reported completed example; do not conflate with programme-wide potential savings. Publication date not stated.                                                                                      |
| Kalundborg → Gyproc                    | Wasted refinery gas reused for drying; industrial gypsum substituted for natural gypsum                | [Kalundborg Symbiosis partner history](https://www.symbiosis.dk/en/saint-gobain-gyproc/). Historical relationships now ceased. No purchase-savings amount published here.                                                                                                                                                      |

### India: Vapi paper mills → Ambuja, 2012

The [Gujarat Cleaner Production Centre paper-sector report](https://gcpcenvis.nic.in/Monographs/cpwastepapersector.pdf) records 15,341.09 tonnes stockpiled on Vapi Paper Mills Ltd premises by November 2012 and 30,873 tonnes dispatched from Vapi paper mills collectively to Ambuja by November 2012, following a 6 April 2011 MoU. These are different measures: a site stock and a regional dispatch total, not an identified shipment from that site. [CPCB May 2017 guidelines, Case Study 2, printed page 18](https://cpcb.nic.in/uploads/plasticwaste/co-processing_guidelines_final_23.05.17.pdf) corroborate previous landfilling/stockpiling and 154,018 tonnes co-processed in 2012–2016 at Kodinar. Payment terms and buyer savings are not disclosed. Plastic served as alternative kiln fuel, not new plastic feedstock; do not apply the clean-PP recycling scenario to this case.

### India: Hi-Tech Carbon → nearby brick manufacturers, 2014

[Company-hosted original case study, The Machinist, February 2015, pages 24–25](https://www.cms.adityabirla.com/uploads/Abg_hi_tech_carbon_Machinist_c0ffdb5e50.pdf): lime-sludge generation 40–50 tonnes/month; former disposal cost ₹1,250/tonne; sale price ₹167/tonne. First sale 25 February 2014; 425.330 tonnes sold by 7 November 2014. Buyers were fly-ash brick manufacturers 10–20 km away, not individually named. Reported ₹9.58 lakh annual tangible benefit is seller benefit, not buyer savings or revenue for the reported sales period. Lime sludge is outside the listed metal/glass/plastic/e-waste categories and has no configured carbon profile.

The page presents these two cases first, followed by the original four precedents. The saved-request waterfall and pilot-proof table were removed from this page; booking details remain in Booking requests. The checklist below is retained as project documentation.

These do not establish a specific business simultaneously buying excessive stock, destroying that exact stock and overlooking a known buyer. Do not fabricate that story or imply those organisations use ScrapLoop.

## Climate calculation and limitations

Published source: [EPA WARM v16, December 2023](https://www.epa.gov/system/files/documents/2023-12/warm_containers_packaging_and_non-durable_goods_materials_v16_dec.pdf). Registry: `dist/evidence-data.js`; shared calculations: `dist/evidence-calculator.js`. `GET /api/evidence`, `POST /api/emissions-assessment`.

Factors are MT CO2e per **US short ton**, not per metric tonne. Convert metric tonnes with ×1000/907.18474. Profiles are limited to clean PP, HDPE, PET, container glass, aluminum cans and steel cans. WARM exhibits 5-3, 5-17, 1-4 and 2-7; full source location/units accompany each profile.

- Successfully diverted mass = baseline waste × adoption × successful recovery.
- Net lifecycle baseline = total waste × baseline factor.
- Alternative = undiverted waste × baseline factor + diverted waste × recycling factor.
- Avoided net CO2e = baseline − alternative. Negative values must remain negative if a scenario worsens the result.
- Recycling includes avoided-production credits and average processing/transport. Do not treat negative credits as negative stack emissions or gross recycling energy demand. Display signed absolute values. Withhold percentages when credits invalidate a gross-pollution denominator.
- WARM assumes US systems; not an India-specific emissions inventory. Route-specific logistics, yield, grid energy and actual disposal must be verified for a pilot. No extra transport factor is silently added or claimed zero.
- Separate **direct burning-point CO2 benchmark** uses supported clean-plastic factors only; excludes alternative processing, recycling transport and replacement energy. It is not a net lifecycle saving or a hazardous-waste/open-burning test.

Default illustrative scenario, editable by the user: **100 metric tonnes clean PP**, controlled combustion baseline, **30% adoption**, **90% recovery**. Diverted mass = **27 tonnes**. Burning-point CO2 baseline ≈307.54 tonnes, remaining ≈224.51 tonnes, avoided ≈**83.04 tonnes**, **27%** at that original burning point. These assumptions do not come from the model’s accuracy and are not actual project outcomes.

Rubber, e-waste, mixed/unknown, industrial metal grades, paper, cardboard, textiles, organic waste, contaminated/hazardous material and open burning have no configured applicable profiles. Selection returns **Insufficient published evidence**, not zero. The assessment catalogue is wider than the classifier; it does not add trained classes. No user factor overrides. No PM2.5, NOx, SO2, dioxin or heavy-metal reduction is inferred from CO2; no lab emission test has been performed.

## Business figures and how to present them

- **Booking request cost breakdown (Booking requests page):** material value → buyer fee + buyer transport → delivered total; seller value − seller fee − seller transport → net proceeds. Compare against a dated virgin-material quote. Saved requests use immutable snapshots and remain pending proposals.
- **Platform scenario:** per-order material value and order count → projected GMV and commission. Below ₹1 lakh/order: 5%; ₹1–10 lakh inclusive: 4%; above ₹10 lakh: 3%. Fee split 70% buyer/30% seller. Transport excluded. Compute the rate per order, never on monthly GMV.
- **Operating economics:** contribution/order = commission/order − variable operating cost/order. Operating result = monthly contribution − fixed costs. Break-even only when costs are supplied and contribution is positive. Refunds, taxes and omitted costs are excluded; commission is not profit.
- **Environment:** baseline/alternative bars with signed credits, explicit boundary and factor citation; adoption sensitivity at fixed recovery, never an unqualified “pollution prevented” percentage.
- **Pitch evidence:** user problem, published case, project measurement, scenario assumptions and pilot proof. Use the browser’s print command to save a PDF with citations and dates. Missing figures stay unknown.

## Pilot proof checklist

Collect accepted-delivery weighbridge records; buyer quality checks; baseline disposal records and costs; dated virgin-material quotes; invoices and payment receipts; freight bills, route distances, vehicle/fuel/load; actual rejects and recovery yields; platform fee collections, customer acquisition/operating costs, repeat orders and cancellation rate. Do not count overlapping pending requests as delivered volume. Hazardous status and permitted treatment need independent documentation; category recognition is not authorisation.

Show buyers verified delivered-cost savings and dependable specifications; sellers net proceeds and avoided disposal cost; platform backers collected commissions, contribution and repeat demand; environmental teams verified mass and comparable published-factor boundaries. Do not assert blanket “25–40% cheaper”, “80% less transport emissions”, a universal pollution percentage or completed transactions without pilot evidence.
