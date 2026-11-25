# Reviewed public facility bundle

This file contains a deliberately limited research directory of **40 publicly documented e-waste facilities across three states**. It is an initial source-backed subset, not a complete national industrial register or a live marketplace.

| State | Records | Primary source |
| --- | ---: | --- |
| Maharashtra | 20 | MPCB's May 2024 list of e-waste recyclers, refurbishers and dismantlers, pages 1–3 |
| Rajasthan | 10 | RSPCB's public e-waste facility page, selected rows in section A |
| Haryana | 10 | HSPCB's public recycler/dismantler PDF, selected rows 29–40 |

The source material was reviewed on **24 November 2026**. `checkedAt` and `retrievedAt` record the source review date; they are not dates of direct business, site, authorization, or stock verification. All publication dates that cannot be established to a specific date remain `null` rather than inventing a day. The Maharashtra document's May 2024 label and the Rajasthan page's update date are explained in source notes.

## Import behavior

`public-facilities.json` is a reviewed source bundle for the explicit **Import public records** action. It does not create records merely by starting the server. Source IDs and facility IDs are stable so repeated imports can update the same records idempotently without duplication. No runtime database or uploaded documents are included in this directory.

## What a record establishes

Each record establishes that the facility name, address and stated activity appeared in its linked public source. It does **not** establish that the facility is currently operating, currently authorized, interested in buying or selling, or holding any material.

- No material quantity, price, purity, polymer grade, demand, capacity or transaction is fabricated from the facility register.
- `materials: ["E-waste"]` reflects the scope of the source register, not confirmation of particular recoverable metals or polymers.
- Every latitude and longitude is `null`: the selected source rows did not provide coordinates. Address text is retained, and unmapped records must stay unmapped until reliable coordinates are supplied.
- District text follows explicit source addresses. An unspecified district stays empty.
- Individual contact people, telephone numbers, email addresses, consent numbers and capacity figures are omitted.
- Separate facilities of the same company can have separate IDs. The duplicate Green Valley entry appearing twice in the Maharashtra list was imported once.
- State and district spellings follow the records rather than claiming present-day administrative boundary normalization.

## Geographic coverage and district distribution

The reviewed snapshot covers 3 of India's 28 states and 8 Union Territories. Facilities are distributed across the following administrative districts:

- **Maharashtra (20 facilities)**: Covers industrial zones in Thane, Pune, Raigad, Palghar, Dhule, and Mumbai suburban areas.
- **Rajasthan (10 facilities)**: Focused primarily on industrial estates in Alwar (including Bhiwadi) and Jaipur.
- **Haryana (10 facilities)**: Concentrated in the National Capital Region industrial hubs including Faridabad, Gurugram, and Sonipat.

All 40 facilities retain physical street and industrial estate addresses. Because primary registers published text addresses without geospatial coordinates, 0 of 40 records include coordinates. ScrapLoop rejects synthetic centroid geocoding or approximation; unmapped facilities remain searchable by name, district, and address.

## Sources and reuse assessment

### Maharashtra Pollution Control Board

[May 2024 facility list](https://mpcb.gov.in/sites/default/files/Authorised%20E-Waste%20Recyclers%20%26%20Refurbishers-May%202024.pdf)

[MPCB website disclaimer and reuse policy](https://mpcb.gov.in/sites/default/files/Establishment%20of%20MPCB/Seniority%20list/2014/Privacy_Policy_MPCB_Website.pdf)

The official policy permits reuse of MPCB content with prominent acknowledgement and without misleading alteration; its exception for third-party material remains applicable. The bundled rows are limited factual transcriptions from an MPCB facility register. Full attribution is retained in each source and facility record. Links should open the publisher's document rather than frame it inside the app.

### Rajasthan State Pollution Control Board

[Public e-waste facility register](https://environment.rajasthan.gov.in/content/environment/en/rajasthan-state-pollution-control-board/information/WasteManagement/E-Waste_Management/DISMANTLERS-REFURBISHERS-RECYCLERS.html)

[Environment Department website policies](https://environment.rajasthan.gov.in/content/environment/en/environmental-information-system/websitepolicies.html)

The primary page was readable when reviewed. Its footer reports an update on 19 November 2026. Only selected factual names, addresses and activities from section A are included. Entries in the revoked/cancelled and closed-operation sections are excluded. No explicit open-data reuse licence was located, so the bundle makes no open-licence claim.

### Haryana State Pollution Control Board

[Public list of e-waste recyclers and dismantlers](https://hspcb.gov.in/uploads/pages/ewaster_66ac829eb3965.pdf)

The official document's factual rows were visible through the primary-source search index. Direct retrieval failed TLS hostname verification; verification was not bypassed. The publication date is not established, so this source is treated as a historical listing with unknown freshness. Only fully visible name/address/activity rows were selected. No explicit open-data reuse licence was located, so the bundle makes no open-licence claim.

## Excluded candidate sources and coverage gaps

The following candidate registers were evaluated and excluded from this release:

1. **Tamil Nadu Pollution Control Board**: The TNPCB [Recycling Directory 2025](https://tnpcb.gov.in/PDF/Updates/Whats_New/Recyclers_Directory_2025.pdf) disclaimer requires prior written permission for reproduction or digital storage. In accordance with policy, no records or content from this directory are bundled.
2. **Central Pollution Control Board (CPCB) aggregate registers**: Scanned aggregate national tables lacked individual state verification timestamps and included ambiguous or overlapping operational statuses. Rather than inferring active operations, these entries were excluded.
3. **Udyam and OGD candidate listings**: Examined datasets lacked clear scrap processing classification and contained self-declared entity types without pollution board authorization references.
4. **General industrial and non-e-waste sectors**: Plastics, textile waste, metallurgical scrap, and organic waste directories lacked comparable verified state pollution control board registers with clear reuse permissions.

**Conclusion**: The initial bundle intentionally retains the 40 verified e-waste records across Maharashtra, Rajasthan, and Haryana. Uncovered states remain explicit gaps in the interface. No speculative or synthetic records have been added.
