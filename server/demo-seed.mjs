// Bengaluru demo dataset: 8 factories, 3 buyers and 12 scrap lots.
//
// Every demo row is stored with `isDemo: true` and an ID starting with
// `demo-blr-`. Reset removes only rows carrying that flag, so imported public
// records, the user's own saved material records and their non-demo pool plans
// are never touched.
//
// Designed scenarios:
//  - Buyer "Bidadi Polymer Recyclers" (PP / PP-H): pool succeeds as soon as the
//    buyer is selected.
//  - Buyer "Nelamangala Steel Re-rollers" (Steel / HMS-1): the shortlisted lots
//    cover 750 of 1,200 kg, so the pool fails. "Make it viable" adds the two
//    nearby excluded Steel lots and the pool becomes viable.
//  - Buyer "Hosur Road Alloy Castings" (Aluminium / ADC12): a second success.
//  - Loop graph: Peenya -> Bommasandra -> Jigani -> Peenya is a closed chain of 3
//    (steel swarf -> billet scrap -> cast blanks).

export const DEMO_PREFIX = 'demo-blr-';
export const DEMO_LABEL = 'Demo';
export const DEMO_CITY = 'Bengaluru';

export const DEMO_SOURCE = {
  id: 'demo-blr-source',
  title: 'ScrapLoop demo dataset — Bengaluru',
  publisher: 'ScrapLoop (Demo data)',
  url: null,
  publicationDate: null,
  coverage: '8 fictional Bengaluru factories, 3 buyers and 12 scrap lots for demonstrations.',
  terms: 'Fictional demo data created by ScrapLoop. Not a public registry record.',
  notes: 'Demo records exist only to demonstrate pooling and loop discovery. Names, addresses, quantities and prices are invented. Use “Reset demo” to remove them without touching imported public records or saved material records.',
};

const fac = (key, name, industry, district, area, latitude, longitude, materials, loopProfile) => ({
  id: `${DEMO_PREFIX}fac-${key}`, name, industry, materials, state: 'Karnataka', district,
  address: `${area}, Bengaluru (fictional demo address)`, latitude, longitude, loopProfile,
});

export const DEMO_FACTORIES = [
  fac('peenya', 'Peenya Auto Components', 'Precision metal machining', 'Bengaluru Urban', 'Peenya Industrial Area', 13.0285, 77.5197,
    ['Steel turning swarf', 'Aluminium die-cast runners'],
    { materialProduced: 'Steel Turning Swarf', materialsAccepted: ['Cast Steel Blanks'], quantityKg: 600, pricePerKg: 50 }),
  fac('bommasandra', 'Bommasandra Induction Melting', 'Secondary steel melting', 'Bengaluru Urban', 'Bommasandra Industrial Area', 12.8166, 77.6950,
    ['Steel billet ends'],
    { materialProduced: 'Refined Steel Billet Scrap', materialsAccepted: ['Steel Turning Swarf'], quantityKg: 550, pricePerKg: 60 }),
  fac('jigani', 'Jigani Precision Foundry', 'Alloy casting & foundry', 'Bengaluru Urban', 'KIADB Jigani Industrial Area', 12.7840, 77.6380,
    ['Steel casting risers', 'Aluminium gates'],
    { materialProduced: 'Cast Steel Blanks', materialsAccepted: ['Refined Steel Billet Scrap'], quantityKg: 500, pricePerKg: 66 }),
  fac('yeshwanthpur', 'Yeshwanthpur Sheet Metal Works', 'Sheet metal stamping', 'Bengaluru Urban', 'Yeshwanthpur Industrial Suburb', 13.0250, 77.5340,
    ['Steel stamping skeletons', 'Aluminium sheet trim'],
    { materialProduced: 'Steel Turning Swarf', materialsAccepted: ['Cold Rolled Steel Coil'], quantityKg: 350, pricePerKg: 48 }),
  fac('ecity', 'Electronic City Injection Moulders', 'Automotive injection moulding', 'Bengaluru Urban', 'Electronic City Phase II', 12.8452, 77.6602,
    ['PP moulding runners'],
    { materialProduced: 'PP Moulding Runners', materialsAccepted: ['Virgin PP Resin'], quantityKg: 500, pricePerKg: 72 }),
  fac('hoskote', 'Hoskote Polymer Granulators', 'Polymer granulation & washing', 'Bengaluru Rural', 'KIADB Hoskote Industrial Area', 13.0707, 77.7982,
    ['Washed PP flakes'],
    { materialProduced: 'Washed PP Flakes', materialsAccepted: ['PP Moulding Runners'], quantityKg: 550, pricePerKg: 68 }),
  fac('whitefield', 'Whitefield Packaging Extruders', 'Packaging sheet extrusion', 'Bengaluru Urban', 'EPIP Zone, Whitefield', 12.9810, 77.7280,
    ['Thermoform sheet offcuts', 'PP copolymer trims'],
    { materialProduced: 'Thermoform Sheet Offcuts', materialsAccepted: ['Washed PP Flakes'], quantityKg: 480, pricePerKg: 70 }),
  fac('doddaballapur', 'Doddaballapur Compounding Works', 'Polymer compounding & pelletising', 'Bengaluru Rural', 'KIADB Doddaballapur Industrial Area', 13.2257, 77.5750,
    ['Regrind PP compound'],
    { materialProduced: 'Regrind PP Compound', materialsAccepted: ['Thermoform Sheet Offcuts'], quantityKg: 500, pricePerKg: 70 }),
];

const byKey = key => DEMO_FACTORIES.find(f => f.id === `${DEMO_PREFIX}fac-${key}`);
const lot = (n, key, title, material, grade, condition, quantityKg, pricePerKg, notes) => {
  const f = byKey(key);
  return {
    id: `${DEMO_PREFIX}lot-${String(n).padStart(2, '0')}`, title, company: f.name, facilityId: f.id,
    material, grade, condition, quantityKg, pricePerKg,
    location: `${f.address.split(',')[0]}, Bengaluru`, latitude: f.latitude, longitude: f.longitude,
    notes: `Demo scrap lot (fictional). ${notes}`,
  };
};

export const DEMO_LOTS = [
  lot(1, 'ecity', 'PP moulding runners', 'PP', 'PP-H', 'Clean', 400, 52, 'Sorted sprues and runners from homopolymer moulds.'),
  lot(2, 'hoskote', 'Washed PP flakes', 'PP', 'PP-H', 'Clean', 350, 55, 'Washed and dried flakes, single polymer.'),
  lot(3, 'whitefield', 'Thermoform sheet offcuts', 'PP', 'PP-H', 'Clean', 300, 58, 'Edge trim from PP-H sheet lines.'),
  lot(4, 'doddaballapur', 'Mixed-colour PP regrind', 'PP', 'PP-H', 'Mixed', 500, 40, 'Mixed colours; excluded by the planner because condition is not Clean.'),
  lot(5, 'peenya', 'Steel turning swarf', 'Steel', 'HMS-1', 'Clean', 400, 31, 'De-oiled CNC turning swarf.'),
  lot(6, 'yeshwanthpur', 'Steel stamping skeletons', 'Steel', 'HMS-1', 'Clean', 350, 32, 'Press-shop skeleton scrap, baled.'),
  lot(7, 'bommasandra', 'Steel billet ends', 'Steel', 'HMS-1', 'Clean', 300, 33, 'Crop ends from billet casting.'),
  lot(8, 'jigani', 'Steel casting risers', 'Steel', 'HMS-1', 'Clean', 250, 34, 'Knocked-off risers and gates.'),
  lot(9, 'peenya', 'Aluminium die-cast runners', 'Aluminium', 'ADC12', 'Clean', 220, 128, 'Runners and overflows from ADC12 dies.'),
  lot(10, 'jigani', 'Aluminium gates', 'Aluminium', 'ADC12', 'Clean', 180, 132, 'Gates and biscuits from ADC12 castings.'),
  lot(11, 'yeshwanthpur', 'Aluminium sheet trim', 'Aluminium', '5052', 'Clean', 150, 140, 'Wrought alloy; does not match ADC12 buyers.'),
  lot(12, 'whitefield', 'PP copolymer trims', 'PP', 'PP-C', 'Clean', 200, 50, 'Copolymer grade; does not match PP-H buyers.'),
];

const lotIds = (...ns) => ns.map(n => `${DEMO_PREFIX}lot-${String(n).padStart(2, '0')}`);

export const DEMO_BUYERS = [
  {
    id: `${DEMO_PREFIX}buyer-bidadi`, order: 1, name: 'Bidadi Polymer Recyclers', location: 'Bidadi Industrial Area, Bengaluru',
    latitude: 12.7970, longitude: 77.3880, maxDistanceKm: 60,
    material: 'PP', grade: 'PP-H', quantityKg: 1000, comparisonPrice: 78, transportCost: 3000, feePercent: 2,
    shortlistLotIds: lotIds(1, 2, 3, 4, 12), scenario: 'success',
    note: 'Expected: pool succeeds with three clean PP-H lots.',
  },
  {
    id: `${DEMO_PREFIX}buyer-nelamangala`, order: 2, name: 'Nelamangala Steel Re-rollers', location: 'Nelamangala, Bengaluru',
    latitude: 13.0990, longitude: 77.3930, maxDistanceKm: 60,
    material: 'Steel', grade: 'HMS-1', quantityKg: 1200, comparisonPrice: 42, transportCost: 4000, feePercent: 2,
    shortlistLotIds: lotIds(5, 6), scenario: 'needs-fix',
    note: 'Expected: shortlisted lots miss the 1,200 kg minimum. Use “Make it viable”.',
  },
  {
    id: `${DEMO_PREFIX}buyer-hosur-road`, order: 3, name: 'Hosur Road Alloy Castings', location: 'Bommanahalli, Hosur Road, Bengaluru',
    latitude: 12.8890, longitude: 77.6400, maxDistanceKm: 40,
    material: 'Aluminium', grade: 'ADC12', quantityKg: 400, comparisonPrice: 165, transportCost: 2500, feePercent: 2,
    shortlistLotIds: lotIds(9, 10, 11), scenario: 'success',
    note: 'Expected: pool succeeds with two ADC12 lots; the 5052 lot is excluded.',
  },
];

const tag = value => ({ ...value, isDemo: true, demoLabel: DEMO_LABEL, demoCity: DEMO_CITY });
const IS_DEMO = "json_extract(json, '$.isDemo') = 1";

export function ensureDemoTables(db) {
  db.exec('CREATE TABLE IF NOT EXISTS buyers (id TEXT PRIMARY KEY, json TEXT NOT NULL);');
}

export function demoStatus(db) {
  ensureDemoTables(db);
  const countDemo = table => db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${IS_DEMO}`).get().count;
  const counts = { facilities: countDemo('facilities'), buyers: countDemo('buyers'), records: countDemo('records'), plans: countDemo('plans') };
  return { loaded: counts.facilities + counts.buyers + counts.records > 0, city: DEMO_CITY, ...counts };
}

export function loadDemoData(db, now = new Date()) {
  ensureDemoTables(db);
  const iso = now.toISOString(); const day = iso.slice(0, 10);
  const source = tag({ ...DEMO_SOURCE, retrievedAt: day });
  const upsert = table => db.prepare(`INSERT INTO ${table} (id,json) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json`);
  const facilityInsert = db.prepare('INSERT INTO facilities (id,source_id,json) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET source_id=excluded.source_id,json=excluded.json');
  const recordInsert = db.prepare('INSERT INTO records (id,analysis_id,json) VALUES (?,NULL,?) ON CONFLICT(id) DO UPDATE SET analysis_id=NULL,json=excluded.json');
  db.exec('BEGIN IMMEDIATE');
  try {
    upsert('sources').run(source.id, JSON.stringify(source));
    for (const f of DEMO_FACTORIES) {
      const facility = tag({ ...f, materials: [...f.materials], loopProfile: { ...f.loopProfile, materialsAccepted: [...f.loopProfile.materialsAccepted] }, sourceId: source.id, sourceUrl: null, sourcePublishedAt: null, checkedAt: day });
      facilityInsert.run(facility.id, source.id, JSON.stringify(facility));
    }
    const buyerInsert = upsert('buyers');
    for (const b of DEMO_BUYERS) buyerInsert.run(b.id, JSON.stringify(tag({ ...b, shortlistLotIds: [...b.shortlistLotIds] })));
    DEMO_LOTS.forEach((l, i) => {
      // Older lots first so the newest-first record list keeps seed order.
      const createdAt = new Date(now.getTime() - (DEMO_LOTS.length - i) * 1000).toISOString();
      const record = tag({ ...l, confirmed: true, createdAt, analysisId: null });
      recordInsert.run(record.id, JSON.stringify(record));
    });
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return { city: DEMO_CITY, facilities: DEMO_FACTORIES.length, buyers: DEMO_BUYERS.length, records: DEMO_LOTS.length };
}

export function resetDemoData(db) {
  ensureDemoTables(db);
  db.exec('BEGIN IMMEDIATE');
  try {
    const demoRecordIds = new Set(db.prepare(`SELECT id FROM records WHERE ${IS_DEMO}`).all().map(r => r.id));
    // Pool plans built from demo lots are demo output too; plans built only from
    // real records stay.
    const planIds = db.prepare('SELECT id, json FROM plans').all().filter(row => {
      const plan = JSON.parse(row.json);
      return plan.isDemo === true || (Array.isArray(plan.allocations) && plan.allocations.some(a => demoRecordIds.has(a.recordId)));
    }).map(row => row.id);
    const deletePlan = db.prepare('DELETE FROM plans WHERE id = ?');
    for (const id of planIds) deletePlan.run(id);
    const records = db.prepare(`DELETE FROM records WHERE ${IS_DEMO}`).run().changes;
    const buyers = db.prepare(`DELETE FROM buyers WHERE ${IS_DEMO}`).run().changes;
    const facilities = db.prepare(`DELETE FROM facilities WHERE ${IS_DEMO}`).run().changes;
    const sources = db.prepare(`DELETE FROM sources WHERE ${IS_DEMO} AND NOT EXISTS (SELECT 1 FROM facilities WHERE facilities.source_id = sources.id)`).run().changes;
    db.exec('COMMIT');
    return { facilities, buyers, records, plans: planIds.length, sources };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
