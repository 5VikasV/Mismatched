import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { mountFeature } from '../dist/features/directory.js';
import { createApp } from '../server/app.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const bundlePath = resolve(projectRoot, 'data/public-facilities.json');
const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));

// Test fixtures with safe and edge-case values
const sampleSources = [
  {
    id: 'src-1',
    title: 'Maharashtra E-Waste Register',
    publisher: 'Maharashtra Pollution Control Board',
    url: 'https://mpcb.gov.in/sample.pdf',
    publicationDate: '2024-05-01',
    retrievedAt: '2026-11-24',
    coverage: 'Maharashtra e-waste recycling',
    terms: 'Reuse permitted with attribution.',
    termsUrl: 'https://mpcb.gov.in/terms.html',
    notes: 'Official state registry transcript.',
  },
  {
    id: 'src-2',
    title: 'Rajasthan E-Waste Portal',
    publisher: 'Rajasthan State Pollution Control Board',
    url: 'https://environment.rajasthan.gov.in/register.html',
    publicationDate: null,
    retrievedAt: '2026-11-24',
    coverage: 'Rajasthan facility register',
    terms: 'Factual public notice transcript.',
    notes: null,
  },
];

const sampleFacilities = [
  {
    id: 'fac-1',
    name: 'Eco Green Recyclers Pvt Ltd',
    industry: 'E-waste recycling',
    materials: ['E-waste', 'PCB boards'],
    state: 'Maharashtra',
    district: 'Thane',
    address: 'Plot 42, Wagle Industrial Estate, Thane West',
    latitude: null,
    longitude: null,
    sourceId: 'src-1',
    sourceUrl: 'https://mpcb.gov.in/sample.pdf',
    sourcePublishedAt: '2024-05-01',
    checkedAt: '2026-11-24',
    sourcePage: 1,
    sourceRow: 5,
  },
  {
    id: 'fac-2',
    name: 'Western Metal & E-Scrap Solutions',
    industry: 'Dismantling and segregation',
    materials: ['E-waste'],
    state: 'Maharashtra',
    district: 'Pune',
    address: 'Gat No. 108, Bhosari MIDC, Pune',
    latitude: 18.62,
    longitude: 73.84,
    sourceId: 'src-1',
    sourceUrl: 'https://mpcb.gov.in/sample.pdf',
    sourcePublishedAt: null,
    checkedAt: '2026-11-24',
    sourcePage: 2,
    sourceRow: null,
  },
  {
    id: 'fac-3',
    name: 'Desert Eco Dismantlers',
    industry: 'E-waste recycling',
    materials: ['E-waste', 'Cathode ray tubes'],
    state: 'Rajasthan',
    district: 'Alwar',
    address: 'RIICO Industrial Area, Phase II, Bhiwadi',
    latitude: null,
    longitude: null,
    sourceId: 'src-2',
    sourceUrl: 'https://environment.rajasthan.gov.in/register.html',
    sourcePublishedAt: null,
    checkedAt: '2026-11-24',
  },
];

function createHarness(initialData = {}) {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: 'http://127.0.0.1:4173/',
  });
  const { window } = dom;
  const root = window.document.getElementById('root');

  let currentData = {
    status: { facilityCount: 0, sourceCount: 0, recordCount: 0 },
    facilities: initialData.facilities || [...sampleFacilities],
    sources: initialData.sources || [...sampleSources],
    records: [],
    ...initialData,
  };

  const toasts = [];
  const navigations = [];
  const apiCalls = [];

  const context = {
    getData: () => currentData,
    api: async (path, options = {}) => {
      apiCalls.push({ path, options });
      if (path === '/api/import-public') {
        currentData = {
          ...currentData,
          facilities: bundle.facilities,
          sources: bundle.sources,
          status: {
            ...currentData.status,
            facilityCount: bundle.facilities.length,
            sourceCount: bundle.sources.length,
          },
        };
        return { importedFacilities: bundle.facilities.length, totalFacilities: bundle.facilities.length };
      }
      return { ok: true };
    },
    refreshData: async () => {},
    navigate: route => navigations.push(route),
    toast: (message, isError = false) => toasts.push({ message, isError }),
  };

  return { dom, window, root, context, toasts, navigations, apiCalls, getData: () => currentData };
}

test('mountFeature attaches data-feature attribute and renders directory', async () => {
  const { root, context } = createHarness();
  const cleanup = await mountFeature(root, context);

  assert.equal(root.getAttribute('data-feature'), 'directory');
  assert.ok(root.querySelector('.directory-view'));
  assert.equal(root.querySelectorAll('.facility-row').length, 3);
  assert.match(root.querySelector('.results-count').textContent, /3 facility records/);

  cleanup();
  assert.equal(root.innerHTML, '');
});

test('text search filters across name, material, address, district, state, and industry', async () => {
  const { root, context, window } = createHarness();
  const cleanup = await mountFeature(root, context);

  const searchInput = root.querySelector('#directory-search');
  assert.ok(searchInput);

  // Search by district name "Pune"
  root.querySelector('#directory-search').value = 'pune';
  root.querySelector('#directory-search').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(root.querySelectorAll('.facility-row').length, 1);
  assert.match(root.querySelector('.facility-row').textContent, /Western Metal/);

  // Search by material "Cathode"
  root.querySelector('#directory-search').value = 'cathode';
  root.querySelector('#directory-search').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(root.querySelectorAll('.facility-row').length, 1);
  assert.match(root.querySelector('.facility-row').textContent, /Desert Eco/);

  // Search by address keyword "Bhiwadi"
  root.querySelector('#directory-search').value = 'bhiwadi';
  root.querySelector('#directory-search').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(root.querySelectorAll('.facility-row').length, 1);
  assert.match(root.querySelector('.facility-row').textContent, /Desert Eco/);

  // Search by multi-term combination
  root.querySelector('#directory-search').value = 'Wagle Thane';
  root.querySelector('#directory-search').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(root.querySelectorAll('.facility-row').length, 1);
  assert.match(root.querySelector('.facility-row').textContent, /Eco Green/);

  cleanup();
});

test('state, district, and industry filters combine consistently with clear-filters action', async () => {
  const { root, context, window } = createHarness();
  const cleanup = await mountFeature(root, context);

  const stateSelect = root.querySelector('#directory-state');
  const industrySelect = root.querySelector('#directory-industry');

  // Filter by state: Maharashtra
  stateSelect.value = 'Maharashtra';
  stateSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(root.querySelectorAll('.facility-row').length, 2);

  // Filter by district: Pune
  const districtSelect = root.querySelector('#directory-district');
  districtSelect.value = 'Pune';
  districtSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(root.querySelectorAll('.facility-row').length, 1);
  assert.match(root.querySelector('.facility-row').textContent, /Western Metal/);

  // Incompatible industry filter -> 0 results
  const indSelectNow = root.querySelector('#directory-industry');
  indSelectNow.value = 'E-waste recycling'; // fac-2 is 'Dismantling and segregation'
  indSelectNow.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(root.querySelectorAll('.facility-row').length, 0);
  assert.ok(root.querySelector('.empty-state'));
  assert.match(root.querySelector('.empty-state').textContent, /No records match these filters/);

  // Clear filters restores all
  const clearBtn = root.querySelector('[data-action="clear-filters"]');
  assert.ok(clearBtn);
  clearBtn.click();

  assert.equal(root.querySelectorAll('.facility-row').length, 3);
  assert.equal(root.querySelector('#directory-search').value, '');
  assert.equal(root.querySelector('#directory-state').value, '');

  cleanup();
});

test('desktop and mobile master-detail selection preserves filter context and restores focus', async () => {
  const { root, context } = createHarness();
  const cleanup = await mountFeature(root, context);

  // Initial state: placeholder in detail panel
  assert.ok(root.querySelector('.detail-placeholder'));
  assert.match(root.querySelector('.detail-placeholder').textContent, /Select a facility/);

  // Click on first facility
  const firstFacilityBtn = root.querySelector('[data-action="select-facility"][data-id="fac-1"]');
  firstFacilityBtn.click();

  // Highlighted in list
  assert.ok(root.querySelector('.facility-row[data-id="fac-1"].selected'));
  assert.ok(root.querySelector('.facility-detail-card'));
  assert.match(root.querySelector('.detail-title').textContent, /Eco Green Recyclers/);

  // Check detail contents
  assert.match(root.querySelector('.detail-grid').textContent, /Plot 42, Wagle Industrial Estate/);
  assert.match(root.querySelector('.detail-grid').textContent, /Thane \/ Maharashtra/);
  assert.match(root.querySelector('.detail-grid').textContent, /Not supplied by the source/);
  assert.match(root.querySelector('.detail-grid').textContent, /Page 1, Row 5/);

  // Check explicit review date distinction text
  assert.match(
    root.querySelector('.detail-grid').textContent,
    /Records when this entry was reviewed from the public register/
  );

  // Check source provenance box
  assert.match(root.querySelector('.source-provenance-box').textContent, /Maharashtra Pollution Control Board/);
  assert.match(root.querySelector('.source-provenance-box a').href, /https:\/\/mpcb.gov.in\/sample.pdf/);

  // Test Deselect via Back-to-list button (used on mobile)
  const backBtn = root.querySelector('[data-action="back-to-list"]');
  assert.ok(backBtn);
  backBtn.click();

  assert.ok(root.querySelector('.detail-placeholder'));
  assert.equal(root.querySelectorAll('.facility-row.selected').length, 0);

  cleanup();
});

test('source links reject javascript: or data: URIs and sanitize unsafe markup', async () => {
  const unsafeFacility = {
    id: 'fac-xss',
    name: '<script>alert("xss")</script>Unsafe Facility & Co',
    industry: '<b>Hazardous</b> recycling',
    materials: ['<img src=x onerror=alert(1)>Copper'],
    state: 'Maharashtra',
    district: 'Thane',
    address: '"><script>evil()</script>123 Danger St',
    latitude: null,
    longitude: null,
    sourceId: 'src-unsafe',
    sourceUrl: 'javascript:alert("malicious")',
    sourcePublishedAt: null,
    checkedAt: '2026-11-24',
  };

  const unsafeSource = {
    id: 'src-unsafe',
    title: '<script>bad()</script>Unsafe Source',
    publisher: 'Evil Corp',
    url: 'javascript:void(0)',
    publicationDate: null,
    retrievedAt: '2026-11-24',
    coverage: 'XSS test coverage',
    terms: '"><img src=x onerror=alert(2)>',
    termsUrl: 'data:text/html,<script>alert(3)</script>',
  };

  const { root, context } = createHarness({
    facilities: [unsafeFacility],
    sources: [unsafeSource],
  });

  const cleanup = await mountFeature(root, context);

  // Ensure script tags were escaped and not injected as DOM nodes
  assert.equal(root.querySelectorAll('script').length, 0);
  assert.match(root.innerHTML, /&lt;script&gt;alert\(/);

  // Select the unsafe facility to inspect details
  const selBtn = root.querySelector('[data-action="select-facility"]');
  selBtn.click();

  // Ensure javascript: link is not rendered as an active URL
  const links = [...root.querySelectorAll('a')];
  for (const a of links) {
    assert.ok(
      a.href.startsWith('http://') || a.href.startsWith('https://'),
      `Unsafe URL protocol found: ${a.href}`
    );
  }

  cleanup();
});

test('map view plots only verified coordinates and displays state coverage counts', async () => {
  const { root, context } = createHarness();
  const cleanup = await mountFeature(root, context);

  const mapToggle = root.querySelector('[data-action="view"][data-view="map"]');
  mapToggle.click();

  assert.ok(root.querySelector('.directory-map-container'));
  assert.ok(root.querySelector('.india-map'));

  // Only fac-2 has coordinates (18.62, 73.84), fac-1 and fac-3 do not
  const svgCircles = root.querySelectorAll('.india-map svg circle[data-action="select-facility"]');
  assert.equal(svgCircles.length, 1);
  assert.match(svgCircles[0].querySelector('title').textContent, /Western Metal/);

  // Coverage count note
  assert.match(root.querySelector('.map-caption').textContent, /1 source-supplied coordinate plotted/);
  assert.match(root.querySelector('.map-caption').textContent, /2 of 3 records lack coordinates/);

  // State coverage panel checks
  const coveragePanel = root.querySelector('.state-coverage-panel');
  assert.ok(coveragePanel);
  assert.match(coveragePanel.textContent, /Maharashtra/);
  assert.match(coveragePanel.textContent, /2 records/);
  assert.match(coveragePanel.textContent, /Rajasthan/);
  assert.match(coveragePanel.textContent, /1 records/);
  assert.match(coveragePanel.textContent, /National Coverage Gaps/);

  // Clicking a state coverage card filters the list
  const stateCard = root.querySelector('[data-action="filter-state"][data-state="Rajasthan"]');
  stateCard.click();

  // Automatically switches back to list view with state filter set
  assert.equal(root.querySelectorAll('.facility-row').length, 1);
  assert.match(root.querySelector('.facility-row').textContent, /Desert Eco/);

  cleanup();
});

test('empty database renders public import call-to-action and triggers import', async () => {
  const { root, context, toasts } = createHarness({ facilities: [], sources: [] });
  const cleanup = await mountFeature(root, context);

  assert.ok(root.querySelector('.empty-state'));
  assert.match(root.textContent, /Your directory starts with evidence/);

  const importBtn = root.querySelector('[data-action="import"]');
  assert.ok(importBtn);
  importBtn.click();

  // Wait a microtick for async import
  await new Promise(r => setTimeout(r, 20));

  assert.ok(toasts.some(t => t.message.includes('Public records imported')));
  assert.equal(root.querySelectorAll('.facility-row').length, bundle.facilities.length);

  cleanup();
});

test('bundled public-facilities.json validates against server createApp import handler', async t => {
  const app = createApp({ dbPath: ':memory:', apiKey: '' });
  t.after(() => app.close());

  // Verify structure of the bundle
  assert.ok(Array.isArray(bundle.sources));
  assert.ok(Array.isArray(bundle.facilities));
  assert.equal(bundle.sources.length, 3);
  assert.equal(bundle.facilities.length, 40);

  const sourceIds = new Set(bundle.sources.map(s => s.id));
  assert.equal(sourceIds.size, 3);

  const facilityIds = new Set();
  for (const f of bundle.facilities) {
    assert.ok(f.id, 'Facility ID is required');
    assert.ok(!facilityIds.has(f.id), `Duplicate facility ID: ${f.id}`);
    facilityIds.add(f.id);

    assert.ok(sourceIds.has(f.sourceId), `Source ID ${f.sourceId} not in sources`);
    assert.match(f.sourceUrl, /^https?:\/\//, 'Source URL must be valid HTTP(S)');
    assert.ok(Array.isArray(f.materials) && f.materials.length > 0);

    // No coordinates or both valid numbers
    if (f.latitude !== null || f.longitude !== null) {
      assert.ok(typeof f.latitude === 'number');
      assert.ok(typeof f.longitude === 'number');
    }

    // No quantities or prices
    assert.equal(f.quantity, undefined);
    assert.equal(f.quantityKg, undefined);
    assert.equal(f.price, undefined);
    assert.equal(f.pricePerKg, undefined);
  }
});
