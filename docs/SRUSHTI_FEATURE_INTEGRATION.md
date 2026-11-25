# Integration of srushtisp09’s features

Source: `origin/feat/features-2`, commits `3c15dee` and `1d4dc1f`. Integrated through a real merge into the current final website, resolving conflicts against the existing real-data architecture. This document records adaptations rather than claiming the older branch can replace the newer application wholesale.

## Included features

| Contributor capability | Integrated behavior |
| --- | --- |
| Match explanations | Expand **Why this lot?** in the planner for material, grade, quantity, price and distance reasons. Scores are rule-based explanations, separate from ML confidence. Exact material/grade compatibility and reviewed-field eligibility remain mandatory. |
| Local matching | Optional buyer latitude/longitude, with no default city. Known distances over 50 km are excluded on client and server. Unknown distances remain explicitly unknown; values represent straight-line distance, not a transport route. |
| Make-it-work suggestions | Incomplete pools show eligible unselected lots; uneconomical pools can suggest cheaper unselected lots. Adding a candidate does not guarantee savings and still requires transport decisions. |
| Fair shared transport | Enter a whole-shipment cost, provider and payer; split the proposed cost across actual allocations by quantity with exact paise reconciliation. This explicitly replaces the pickup proposals and remains subject to review. The fixed 5%/4%/3% commission and 70:30 split are unchanged. |
| Confidence indicators | Original local-model category scores appear next to the material field. Missing grade/weight/price confidence stays absent. Low scores and model review flags request verification; they do not diagnose a need for a laboratory test. Grade/purity require separate supporting evidence. |
| Planned impact dashboard | Aggregate non-cancelled booking snapshots, using buyer differences, seller net proceeds and quoted commission. No delivered quantity, collected income or actual landfill diversion is claimed. Repeated lot references are disclosed; carbon totals are not summed across overlapping requests. |
| Loop graph | Contributor graph/chain engine retained with demo defaults removed. The UI draws a selected pending request’s actual proposed supplier-to-buyer links and supports keyboard node inspection. Unknown buyer output streams do not become invented closed industrial loops. The engine can find explicitly provided 2–4-node cycles, covered by fixtures. |
| Circular loading indicator | Contributor compact loop renderer is used for workspace/module loading with its reduced-motion stylesheet. The transparent Blender exhibit remains the Overview model. |

Both new pages are available through workspace navigation and page search: `#impact` and `#loop`. Existing root-hash compatibility redirects also recognize them.

## Carbon-factor reconciliation

The incoming broad estimates did not provide a reproducible calculation for every number. Only PP, HDPE and PET are enabled as an explicitly selected **US EPA WARM closed-loop resin recycling benchmark**. The default dashboard reports no carbon estimate until that scenario is selected. Other materials remain “Not enough data”; broad plastic is not silently mapped to a specific resin, and iron/paper are not silently mapped to steel/cardboard.

Primary reference: [EPA WARM v16 Containers, Packaging, and Non-Durable Goods, December 2023](https://www.epa.gov/system/files/documents/2023-12/warm_containers_packaging_and_non-durable_goods_materials_v16_dec.pdf), Exhibit 5-11, printed page 5-8 / PDF page 77. Recycling-credit magnitudes are 0.79 for PP, 0.76 for HDPE and 1.04 for PET, in metric tonnes CO₂e per US short ton. Conversion to kg CO₂e/kg is `credit × 1000 / 907.18474`.

This is a scenario comparison, not a verified India-specific industrial LCA, a complete landfill-to-recycling delta, a pickup-emissions model or a carbon-credit calculation. The benchmark is shown per request with its source; any unsupported material or overlapping lot makes the combined carbon total unavailable.

## Intentionally excluded or replaced

- Demo factories, seeded lots, demo buyers and load/reset endpoints: excluded to respect the real-data requirement. No demo records are created in the user database.
- Browser-storage simulated sign-in/account creation: excluded to preserve the account-free workflow and avoid representing simulated authentication as real accounts.
- Older landing/theme, duplicated monolithic forms, arbitrary editable fees and missing specialist/Blender dependencies: replaced by the current final website versions.
- Default Mumbai coordinates and substring-based compatibility: removed. Missing geographic data is not invented and related material names do not prove industrial compatibility.
- Prototype `SVGElement.click` patch: unnecessary; real keyboard/click handling is implemented on graph nodes.

The merge preserves the contributor commits in Git history. Shared engine code is adapted into focused modules rather than overwriting the tested current backend or frontend.

## API additions and compatibility

- `GET /api/impact`: projections from existing non-cancelled booking snapshots, with no carbon scenario enabled.
- `GET /api/impact?scenario=warm-closed-loop`: adds source-backed per-request benchmark values when the material is supported.
- `GET /api/compatibility-rules`: explicit empty defaults; no sample factories or prices.
- Booking requirements optionally accept paired `buyerLatitude`/`buyerLongitude`. Invalid or one-sided coordinates are rejected; existing requests without these fields remain valid. Shared calculator eligibility enforces the same 50 km rule for previews and saves.

Existing SQLite records, booking snapshots, private configuration, ML checkpoint and Blender assets are retained. Restart the server after this update to load the added endpoints.

## Verification

Completed 70 Node tests and all 36 browser scenarios in viewport batches at 360, 768 and 1366 pixels. The new integrated-feature walkthrough was also exercised separately at all three widths.

Unit/API tests cover unknown geography, strict grades/materials, radius enforcement, split-cost reconciliation, real-data suggestions, empty graph defaults, explicit cycles, request flows, confidence handling, scenario opt-in, overlap suppression and cancellation exclusion. Browser tests exercise the full integrated feature path at 360, 768 and 1366 pixels alongside existing booking, analysis, landing and Blender workflows. All tests use disposable databases and no paid provider key.
