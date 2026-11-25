// Seed or remove the Bengaluru demo dataset in the local SQLite database.
//
//   npm run seed:demo          -> load (or refresh) 8 factories, 3 buyers, 12 scrap lots
//   npm run seed:demo:reset    -> remove only demo rows; real records stay
//   node scripts/seed-demo.mjs --db path/to/research.sqlite [--reset]
import { createApp } from '../server/app.mjs';

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const dbIndex = args.indexOf('--db');
const dbPath = dbIndex >= 0 ? args[dbIndex + 1] : undefined;
if (dbIndex >= 0 && !dbPath) { console.error('Provide a path after --db.'); process.exit(1); }

const app = createApp(dbPath ? { dbPath } : {});
try {
  if (reset) {
    const r = app.resetDemo();
    console.log(`Demo data removed: ${r.facilities} factories, ${r.buyers} buyers, ${r.records} scrap lots, ${r.plans} demo pool plans. Real imported records and saved materials were not touched.`);
  } else {
    const r = app.loadDemo();
    console.log(`Demo data loaded for ${r.city}: ${r.facilities} factories, ${r.buyers} buyers, ${r.records} scrap lots (all labelled "Demo").`);
  }
} finally {
  app.close();
}
