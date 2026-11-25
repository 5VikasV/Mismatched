import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createApp } from '../server/app.mjs';
import { icon } from '../dist/icons.js';
import { planPool, scoreMatch, calculateImpact, DEMO_COMPATIBILITY_RULES, buildLoopGraph, findLoopChains } from '../dist/planner.js';
import { CO2_FACTORS, CO2_FACTOR_LIST, getCo2Factor } from '../dist/co2-factors.js';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 5));

async function until(check, message = 'UI condition') {
  for (let i = 0; i < 120; i++) {
    if (check()) return;
    await tick();
  }
  assert.fail(`${message} did not become ready`);
}

async function request(app, path, init = {}) {
  const req = Readable.from(init.body ? [Buffer.from(init.body)] : []);
  req.url = String(path);
  req.method = init.method || 'GET';
  req.headers = {
    host: '127.0.0.1:4173',
    origin: 'http://127.0.0.1:4173',
    ...Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v])),
  };
  const result = { status: 0, headers: {}, body: '' };
  const res = {
    headersSent: false,
    setHeader(k, v) { result.headers[k.toLowerCase()] = v; },
    writeHead(s, h = {}) {
      result.status = s;
      this.headersSent = true;
      for (const [k, v] of Object.entries(h)) this.setHeader(k, v);
    },
    end(value) { result.body = value?.toString() || ''; },
  };
  await app.handle(req, res);
  return {
    ok: result.status >= 200 && result.status < 300,
    status: result.status,
    json: async () => JSON.parse(result.body),
    text: async () => result.body,
  };
}

async function bootUI(t, app) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:4173/#overview',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const { window } = dom;
  const { document } = window;
  window.scrollTo = () => {};
  window.Element.prototype.scrollIntoView = () => {};
  window.URL.createObjectURL = () => 'blob:local-preview';
  window.URL.revokeObjectURL = () => {};
  window.fetch = (path, init) => request(app, path, init);
  window.__icon = icon;
  window.__planPool = planPool;
  window.__scoreMatch = scoreMatch;
  window.__calcImpact = calculateImpact;
  window.__co2Factors = CO2_FACTORS;
  window.__co2List = CO2_FACTOR_LIST;
  window.__getCo2Factor = getCo2Factor;
  window.__demoRules = DEMO_COMPATIBILITY_RULES;
  window.__buildLoopGraph = buildLoopGraph;
  window.__findLoopChains = findLoopChains;
  window.eval(
    `const icon=window.__icon;const planPool=window.__planPool;const scoreMatch=window.__scoreMatch;const calcImpactImport=window.__calcImpact;const co2FactorsImport=window.__co2Factors;const co2ListImport=window.__co2List;const getCo2FactorImport=window.__getCo2Factor;const demoRulesImport=window.__demoRules;const buildLoopGraphImport=window.__buildLoopGraph;const findLoopChainsImport=window.__findLoopChains;\n${source.replace(/^import .*;\s*$/gm, '')}`
  );
  t.after(() => {
    window.close();
    assert.deepEqual(errors, [], 'No application runtime errors');
  });
  await until(() => document.body.dataset.ready === 'true', 'Initial API loading');
  const $ = s => {
    const e = document.querySelector(s);
    assert.ok(e, `Missing element: ${s}`);
    return e;
  };
  const click = s => $(s).click();
  const route = async name => {
    window.location.hash = name;
    await tick();
  };
  return { window, document, $, click, route };
}

test('seed script CLI loads 8 Bengaluru factories, 3 buyers and 12 scrap lots and reset removes only demo rows', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'scraploop-seed-cli-'));
  const dbPath = join(dir, 'research.sqlite');
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  // Seed real public data + a real user-saved material record + a real pool plan before running demo seed
  const prep = createApp({
    dbPath,
    publicDataPath: fileURLToPath(new URL('../data/public-facilities.json', import.meta.url)),
  });
  const importRes = await request(prep, '/api/import-public', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(importRes.status, 200);
  const realRecRes = await request(prep, '/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Real Pune PP Lot',
      company: 'Real Pune Works',
      material: 'PP',
      grade: 'PP-H',
      condition: 'Clean',
      quantityKg: 250,
      pricePerKg: 45,
      location: 'Pune',
      latitude: 18.52,
      longitude: 73.85,
      notes: 'User saved record',
      confirmed: true,
    }),
  });
  assert.equal(realRecRes.status, 201);
  const realPlanRes = await request(prep, '/api/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Real Pune PP Pool',
      material: 'PP',
      grade: 'PP-H',
      quantityKg: 200,
      comparisonPrice: 75,
      transportCost: 500,
      feePercent: 0,
    }),
  });
  assert.equal(realPlanRes.status, 201);
  prep.close();

  // Run seed script
  const seedOutput = execFileSync(process.execPath, ['scripts/seed-demo.mjs', '--db', dbPath], { encoding: 'utf8' });
  assert.match(seedOutput, /Bengaluru: 8 factories, 3 buyers, 12 scrap lots/);

  // Verify database contents via app
  const app1 = createApp({ dbPath });
  try {
    const facRes = await (await request(app1, '/api/facilities')).json();
    const demoFacs = facRes.facilities.filter(f => f.isDemo);
    const realFacs = facRes.facilities.filter(f => !f.isDemo);
    assert.equal(demoFacs.length, 8);
    assert.equal(realFacs.length, 40);
    assert.ok(demoFacs.every(f => f.demoLabel === 'Demo' && f.demoCity === 'Bengaluru' && /Bengaluru/i.test(f.address)));

    const buyerRes = await (await request(app1, '/api/buyers')).json();
    assert.equal(buyerRes.buyers.length, 3);
    assert.ok(buyerRes.buyers.every(b => b.isDemo && b.demoLabel === 'Demo' && /Bengaluru/i.test(b.location)));

    const recRes = await (await request(app1, '/api/records')).json();
    const demoRecs = recRes.records.filter(r => r.isDemo);
    const realRecs = recRes.records.filter(r => !r.isDemo);
    assert.equal(demoRecs.length, 12);
    assert.equal(realRecs.length, 1);
    assert.ok(demoRecs.every(r => r.demoLabel === 'Demo' && /Bengaluru/i.test(r.location)));

    const status = await (await request(app1, '/api/demo')).json();
    assert.equal(status.loaded, true);
    assert.equal(status.facilities, 8);
    assert.equal(status.buyers, 3);
    assert.equal(status.records, 12);
  } finally {
    app1.close();
  }

  // Run seed script --reset
  const resetOutput = execFileSync(process.execPath, ['scripts/seed-demo.mjs', '--db', dbPath, '--reset'], { encoding: 'utf8' });
  assert.match(resetOutput, /8 factories, 3 buyers, 12 scrap lots/);

  const app2 = createApp({ dbPath });
  try {
    const facRes = await (await request(app2, '/api/facilities')).json();
    assert.equal(facRes.facilities.length, 40);
    assert.equal(facRes.facilities.filter(f => f.isDemo).length, 0);

    const buyerRes = await (await request(app2, '/api/buyers')).json();
    assert.equal(buyerRes.buyers.length, 0);

    const recRes = await (await request(app2, '/api/records')).json();
    assert.equal(recRes.records.length, 1);
    assert.equal(recRes.records[0].title, 'Real Pune PP Lot');

    const planRes = await (await request(app2, '/api/plans')).json();
    assert.equal(planRes.plans.length, 1);
    assert.equal(planRes.plans[0].title, 'Real Pune PP Pool');

    const srcRes = await (await request(app2, '/api/sources')).json();
    assert.equal(srcRes.sources.length, 3);
  } finally {
    app2.close();
  }
});

test('UI Load demo data, Demo labels, succeeding pool, failing pool fixed by Make it viable, chain of 3 in loop graph, and Reset demo preserving real records', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'scraploop-demo-ui-'));
  const dbPath = join(dir, 'research.sqlite');
  const app = createApp({
    dbPath,
    publicDataPath: fileURLToPath(new URL('../data/public-facilities.json', import.meta.url)),
  });
  t.after(() => {
    app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  // Pre-seed real public records and a real saved material record
  const imp = await request(app, '/api/import-public', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(imp.status, 200);
  await request(app, '/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Real User Steel Lot',
      company: 'Real Nagpur Steel',
      material: 'Steel',
      grade: 'SS-304',
      condition: 'Clean',
      quantityKg: 100,
      pricePerKg: 95,
      location: 'Nagpur',
      latitude: 21.14,
      longitude: 79.08,
      notes: 'Keep after demo reset',
      confirmed: true,
    }),
  });

  const ui = await bootUI(t, app);

  // Load demo data button is present and Reset demo is hidden until demo data is loaded
  assert.ok(ui.document.querySelector('[data-action="demo-load"]'));
  assert.equal(ui.document.querySelector('[data-action="demo-reset"]'), null);
  ui.click('[data-action="demo-load"]');

  await until(() => Boolean(ui.document.querySelector('[data-action="demo-reset"]')), 'Demo data loaded');
  assert.match(ui.$('#toast').textContent, /Bengaluru: 8 factories, 3 buyers and 12 scrap lots/);

  // Directory shows the 8 Bengaluru demo factories alongside the 40 real facilities, each demo factory labelled "Demo"
  await ui.route('directory');
  const allFacilityRows = [...ui.document.querySelectorAll('.facility-row')];
  assert.equal(allFacilityRows.length, 48);
  const demoFacilityRows = allFacilityRows.filter(row => row.querySelector('[data-demo-badge]')?.textContent === 'Demo');
  assert.equal(demoFacilityRows.length, 8);

  // Material analysis shows 12 demo scrap lots labelled "Demo" + 1 real record without Demo badge
  await ui.route('analysis');
  const allRecordCards = [...ui.document.querySelectorAll('.record-card')];
  assert.equal(allRecordCards.length, 13);
  const demoRecordCards = allRecordCards.filter(card => card.querySelector('[data-demo-badge]')?.textContent === 'Demo');
  assert.equal(demoRecordCards.length, 12);

  // Pool planner shows 3 Bengaluru demo buyers all labelled "Demo"
  await ui.route('planner');
  const buyerCards = [...ui.document.querySelectorAll('[data-demo-buyer]')];
  assert.equal(buyerCards.length, 3);
  assert.ok(buyerCards.every(card => card.querySelector('[data-demo-badge]')?.textContent === 'Demo'));

  // 1) Buyer 1 (Bidadi Polymer Recyclers) pool succeeds immediately
  ui.click('[data-demo-buyer="demo-blr-buyer-bidadi"] [data-action="use-demo-buyer"]');
  assert.equal(ui.document.querySelector('[data-gap-card]'), null);
  assert.match(ui.$('.planner-result').textContent, /1,000\s*\/\s*1,000 kg/);
  assert.match(ui.$('.planner-result').textContent, /Lower estimated cost/);
  assert.match(ui.$('.cost-row.net-profit').textContent, /₹19,359\.00/);

  // 2) Buyer 2 (Nelamangala Steel Re-rollers) fails initially (750 / 1,200 kg, 450 kg missing)
  ui.click('[data-demo-buyer="demo-blr-buyer-nelamangala"] [data-action="use-demo-buyer"]');
  const gapCard = ui.$('[data-gap-card="missing_minimum"]');
  assert.match(gapCard.textContent, /450 kg missing/);
  const makeViableBtn = ui.$('[data-action="make-viable"]');
  assert.match(makeViableBtn.textContent, /Make it viable/);

  // Clicking "Make it viable" adds the nearby excluded compatible lots and makes the pool succeed
  makeViableBtn.click();
  assert.equal(ui.document.querySelector('[data-gap-card]'), null);
  assert.match(ui.$('.planner-result').textContent, /1,200\s*\/\s*1,200 kg/);
  assert.match(ui.$('.planner-result').textContent, /Lower estimated cost/);
  assert.match(ui.$('.cost-row.net-profit').textContent, /₹7,028\.00/);

  // Save a demo pool plan so we also verify Reset demo cleans up demo-backed plans
  ui.click('[data-action="save-plan"]');
  await until(async () => (await (await request(app, '/api/plans')).json()).plans.length === 1, 'Demo pool plan saved');

  // 3) Loop graph shows 8 Demo factories and at least one chain of length 3
  await ui.route('loop');
  assert.equal(ui.document.querySelectorAll('[data-loop-node]').length, 8);
  assert.equal(ui.document.querySelectorAll('[data-loop-node-demo]').length, 8);
  const chainsOf3 = [...ui.document.querySelectorAll('[data-loop-chain]')].filter(c => Number(c.dataset.chainLength) >= 3);
  assert.ok(chainsOf3.length >= 1, 'Loop graph shows at least one chain of 3');
  assert.match(chainsOf3[0].textContent, /Peenya Auto Components → Bommasandra Induction Melting → Jigani Precision Foundry → Peenya Auto Components/);

  // 4) Reset demo removes only demo records, leaving real imported facilities, real saved material, and real sources untouched
  await ui.route('sources');
  assert.equal(ui.$('[data-demo-panel]').dataset.demoLoaded, 'true');
  ui.click('[data-action="demo-reset"]');
  await until(() => ui.$('[data-demo-panel]').dataset.demoLoaded === 'false', 'Demo data reset');

  assert.equal((await (await request(app, '/api/facilities')).json()).facilities.length, 40);
  assert.equal((await (await request(app, '/api/sources')).json()).sources.length, 3);
  assert.equal((await (await request(app, '/api/buyers')).json()).buyers.length, 0);
  const remainingRecords = (await (await request(app, '/api/records')).json()).records;
  assert.equal(remainingRecords.length, 1);
  assert.equal(remainingRecords[0].title, 'Real User Steel Lot');
  assert.equal((await (await request(app, '/api/plans')).json()).plans.length, 0);
});
