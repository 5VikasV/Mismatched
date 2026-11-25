import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { createApp } from '../server/app.mjs';

const source = { id: 'test-source', title: 'Public facility directory', publisher: 'Test publisher', url: 'https://example.org/facilities', publicationDate: '2025-01-01', retrievedAt: '2026-11-24', coverage: 'Fixture state', terms: 'Fixture source attribution', notes: 'Test fixture only.' };
const facility = { id: 'test-facility', name: 'Test Plastics Facility', industry: 'Plastic recycling', materials: ['PP'], state: 'Maharashtra', district: 'Pune', address: 'Test Industrial Estate', latitude: 18.5, longitude: 73.8, sourceId: source.id, sourceUrl: source.url, sourcePublishedAt: source.publicationDate, checkedAt: source.retrievedAt };
const bundle = () => ({ sources: [{ ...source }], facilities: [{ ...facility, materials: [...facility.materials] }] });

function setup(t, options = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'scraploop-server-test-'));
  const publicDataPath = join(dir, 'public.json');
  writeFileSync(publicDataPath, JSON.stringify(bundle()));
  const app = createApp({ dbPath: join(dir, 'research.sqlite'), publicDataPath, apiKey: '', ...options });
  t.after(() => { app.close(); rmSync(dir, { recursive: true, force: true }); });
  return { app, dir, publicDataPath };
}
async function call(app, path, { method = 'GET', data, headers = {}, raw } = {}) {
  const payload = raw ?? (data === undefined ? '' : JSON.stringify(data));
  const req = Readable.from(payload ? [Buffer.from(payload)] : []);
  req.url = path; req.method = method;
  req.headers = { host: 'localhost:4173', ...(method !== 'GET' && method !== 'HEAD' ? { 'content-type': 'application/json' } : {}), ...headers };
  const response = { status: null, headers: {}, text: '' };
  const res = { headersSent: false, setHeader(name, value) { response.headers[name.toLowerCase()] = value; }, writeHead(status, headers) { response.status = status; this.headersSent = true; for (const [key, value] of Object.entries(headers || {})) this.setHeader(key, value); }, end(value) { response.text = value?.toString() || ''; } };
  await app.handle(req, res);
  if (response.headers['content-type']?.startsWith('application/json')) response.json = JSON.parse(response.text);
  return response;
}
const importPublic = app => call(app, '/api/import-public', { method: 'POST', data: {} });
const record = () => ({ title: 'Reviewed PP trimmings', company: 'Team research', material: 'PP', grade: null, condition: null, quantityKg: null, pricePerKg: null, location: 'Pune', latitude: null, longitude: null, notes: 'Unknown values remain unknown.', confirmed: true });
const file = () => ({ name: 'invoice.pdf', mimeType: 'application/pdf', dataBase64: Buffer.from('%PDF-1.4\nA test invoice').toString('base64') });
const suggestions = () => ({ material: 'PP', grade: null, quantityKg: 120, pricePerKg: null, company: null, location: null, condition: null, evidence: [{ field: 'material', quote: 'PP trimmings', page: 1 }, { field: 'quantityKg', quote: '120 kg', page: 1 }], warnings: ['Grade is not stated.'] });

test('new database is empty, persists research across reopen, and never exposes an API key', async t => {
  const { app, dir } = setup(t, { apiKey: 'super-secret-test-key' });
  const status = await call(app, '/api/status');
  const {vision,...existing}=status.json; assert.equal(typeof vision.available,'boolean');
  assert.deepEqual(existing, { aiConfigured: true, model: 'gpt-4.1-mini', facilityCount: 0, sourceCount: 0, recordCount: 0 });
  assert.equal(status.text.includes('super-secret'), false);
  const saved = await call(app, '/api/records', { method: 'POST', data: record() });
  assert.equal(saved.status, 201); assert.equal(saved.json.record.quantityKg, null);
  const second = createApp({ dbPath: join(dir, 'research.sqlite') });
  try { const result = await call(second, '/api/records'); assert.equal(result.json.records[0].title, 'Reviewed PP trimmings'); }
  finally { second.close(); }
});

test('public imports are idempotent and preserve source attribution and unknown availability', async t => {
  const { app } = setup(t);
  assert.equal((await importPublic(app)).json.totalFacilities, 1);
  assert.equal((await importPublic(app)).json.totalFacilities, 1);
  const list = (await call(app, '/api/facilities')).json;
  assert.equal(list.facilities[0].sourceUrl, source.url);
  assert.equal(list.facilities[0].quantityKg, undefined);
  assert.deepEqual(list.states, ['Maharashtra']);
  assert.equal((await call(app, '/api/sources')).json.sources[0].terms, source.terms);
});

test('reviewed public bundle imports end-to-end with attributable facilities and explicit coverage gaps', async t => {
  const { app } = setup(t, { publicDataPath: new URL('../data/public-facilities.json', import.meta.url).pathname });
  const imported = await importPublic(app);
  assert.equal(imported.status, 200);
  assert.ok(imported.json.totalFacilities >= 30);
  assert.ok(imported.json.totalSources >= 3);
  const directory = (await call(app, '/api/facilities')).json;
  assert.ok(directory.states.includes('Maharashtra'));
  assert.ok(directory.states.includes('Rajasthan'));
  assert.ok(directory.states.includes('Haryana'));
  const sources = (await call(app, '/api/sources')).json.sources;
  for (const item of directory.facilities) {
    assert.ok(sources.some(s => s.id === item.sourceId));
    assert.match(item.sourceUrl, /^https?:\/\//);
    assert.equal(item.quantityKg, undefined);
    assert.equal(item.pricePerKg, undefined);
    assert.ok(item.checkedAt);
  }
  assert.equal((await importPublic(app)).json.totalFacilities, imported.json.totalFacilities);
});

test('facility search and state, industry and material filters select actual records', async t => {
  const { app, publicDataPath } = setup(t); const data = bundle();
  data.facilities.push({ ...facility, id: 'other', name: 'Other Metal Works', industry: 'Metal recovery', materials: ['Steel'], state: 'Gujarat', district: 'Surat', latitude: null, longitude: null });
  writeFileSync(publicDataPath, JSON.stringify(data)); await importPublic(app);
  for (const query of ['q=pune', 'state=Maharashtra', 'industry=Plastic%20recycling', 'material=pp']) assert.equal((await call(app, `/api/facilities?${query}`)).json.total, 1);
  assert.equal((await call(app, '/api/facilities?q=missing')).json.total, 0);
  assert.equal((await call(app, '/api/facilities')).json.total, 2);
});

test('invalid attribution, duplicate IDs, invented availability and bad coordinates reject entire import', async t => {
  const { app, publicDataPath } = setup(t);
  const mutations = [b => { b.sources[0].terms = ''; }, b => { b.facilities[0].sourceId = 'missing'; }, b => { b.facilities.push({ ...b.facilities[0] }); }, b => { b.facilities[0].quantityKg = 100; }, b => { b.facilities[0].latitude = 100; }, b => { b.facilities[0].sourceUrl = 'javascript:alert(1)'; }];
  for (const change of mutations) {
    const b = bundle(); change(b); writeFileSync(publicDataPath, JSON.stringify(b));
    assert.equal((await importPublic(app)).status, 400);
    assert.equal((await call(app, '/api/status')).json.facilityCount, 0);
    assert.equal((await call(app, '/api/status')).json.sourceCount, 0);
  }
});

test('research requires review confirmation, validates quantities and supports deletion', async t => {
  const { app } = setup(t);
  for (const changes of [{ confirmed: false }, { quantityKg: -2 }, { quantityKg: '120' }, { latitude: 18, longitude: null }, { title: '' }, { analysisId: 'missing' }]) assert.equal((await call(app, '/api/records', { method: 'POST', data: { ...record(), ...changes } })).status, 400);
  const saved = await call(app, '/api/records', { method: 'POST', data: { ...record(), quantityKg: 12.5, pricePerKg: 0 } });
  assert.equal(saved.status, 201); assert.equal(saved.json.record.quantityKg, 12.5);
  const id = saved.json.record.id;
  assert.equal((await call(app, `/api/records/${id}`, { method: 'DELETE', data: {} })).status, 200);
  assert.equal((await call(app, `/api/records/${id}`, { method: 'DELETE', data: {} })).status, 404);
  assert.equal((await call(app, '/api/records')).json.records.length, 0);
});

test('OpenAI extraction sends server-only auth, typed file input, strict schema and saves evidence', async t => {
  let request;
  const { app } = setup(t, { apiKey: 'test-key-secret', fetchImpl: async (url, init) => { request = { url, ...init, body: JSON.parse(init.body) }; return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(suggestions()) }] }] }) }; } });
  const result = await call(app, '/api/analyze', { method: 'POST', data: file() });
  assert.equal(result.status, 200); assert.equal(result.json.suggestions.quantityKg, 120);
  assert.equal(result.text.includes('test-key-secret'), false);
  assert.equal(request.headers.Authorization, 'Bearer test-key-secret');
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.body.store, false); assert.equal(request.body.text.format.strict, true);
  assert.equal(request.body.input[0].content[1].type, 'input_file');
  assert.equal((await call(app, `/api/analyses/${result.json.id}`)).json.filename, 'invoice.pdf');
  const saved = await call(app, '/api/records', { method: 'POST', data: { ...record(), analysisId: result.json.id } });
  assert.equal(saved.json.record.analysisId, result.json.id);
});

test('unsupported, empty, oversize and disguised uploads never reach the model', async t => {
  let calls = 0; const { app } = setup(t, { apiKey: 'key', fetchImpl: async () => { calls++; throw new Error(); } });
  const files = [{ ...file(), mimeType: 'text/html' }, { ...file(), dataBase64: 'not!base64' }, { ...file(), dataBase64: '' }, { ...file(), dataBase64: Buffer.from('not a PDF').toString('base64') }, { ...file(), dataBase64: Buffer.alloc(10 * 1024 * 1024 + 1).toString('base64') }];
  for (const value of files) assert.ok((await call(app, '/api/analyze', { method: 'POST', data: value })).status >= 400);
  assert.equal(calls, 0);
});

test('image analysis uses an image content part and prevents overlapping paid requests', async t => {
  let release; let started;
  const begun = new Promise(resolve => { started = resolve; });
  let request;
  const { app } = setup(t, { apiKey: 'key', fetchImpl: async (_url, init) => {
    request = JSON.parse(init.body); started();
    await new Promise(resolve => { release = resolve; });
    return { ok: true, json: async () => ({ output_text: JSON.stringify(suggestions()) }) };
  } });
  const png = { name: 'material.png', mimeType: 'image/png', dataBase64: Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64') };
  const first = call(app, '/api/analyze', { method: 'POST', data: png });
  await begun;
  const second = await call(app, '/api/analyze', { method: 'POST', data: png });
  assert.equal(second.status, 429); assert.equal(second.json.error, 'analysis_busy');
  assert.equal(request.input[0].content[1].type, 'input_image');
  assert.match(request.input[0].content[1].image_url, /^data:image\/png;base64,/);
  release(); assert.equal((await first).status, 200);
});

test('valid multi-megabyte uploads do not overflow the base64 validator', async t => {
  let calls = 0;
  const { app } = setup(t, { apiKey: 'key', fetchImpl: async () => { calls++; return { ok: true, json: async () => ({ output_text: JSON.stringify(suggestions()) }) }; } });
  const bytes = Buffer.alloc(5 * 1024 * 1024);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);
  const response = await call(app, '/api/analyze', { method: 'POST', data: { name: 'large.png', mimeType: 'image/png', dataBase64: bytes.toString('base64') } });
  assert.equal(response.status, 200); assert.equal(calls, 1);
});

test('missing key and provider errors are actionable and do not leak provider bodies', async t => {
  const missing = setup(t);
  assert.equal((await call(missing.app, '/api/analyze', { method: 'POST', data: file() })).json.error, 'ai_not_configured');
  for (const status of [401, 429, 500]) {
    const { app } = setup(t, { apiKey: 'secret', fetchImpl: async () => ({ ok: false, status, text: async () => 'secret provider body' }) });
    const response = await call(app, '/api/analyze', { method: 'POST', data: file() });
    assert.equal(response.status, status === 429 ? 429 : 502);
    assert.equal(response.text.includes('secret'), false);
  }
});

test('unsupported AI output fails safely and evidence-free facts stay unknown', async t => {
  const invalid = setup(t, { apiKey: 'key', fetchImpl: async () => ({ ok: true, json: async () => ({ output_text: 'not JSON' }) }) });
  assert.equal((await call(invalid.app, '/api/analyze', { method: 'POST', data: file() })).json.error, 'invalid_ai_output');
  const value = suggestions(); value.grade = 'PP-H';
  const { app } = setup(t, { apiKey: 'key', fetchImpl: async () => ({ ok: true, json: async () => ({ output_text: JSON.stringify(value) }) }) });
  const response = await call(app, '/api/analyze', { method: 'POST', data: file() });
  assert.equal(response.json.suggestions.grade, null);
  assert.match(response.json.suggestions.warnings.join(' '), /left unknown/);
});

test('loopback host and same-origin checks protect local endpoints and reject non-JSON writes', async t => {
  const { app } = setup(t);
  assert.equal((await call(app, '/api/status', { headers: { host: 'evil.example' } })).status, 403);
  assert.equal((await call(app, '/api/status', { headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await call(app, '/api/status', { headers: { origin: 'http://localhost:4173' } })).status, 200);
  assert.equal((await call(app, '/api/import-public', { method: 'POST', data: {}, headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await call(app, '/api/import-public', { method: 'POST', raw: 'bad JSON' })).status, 400);
});

test('landing-first routing serves workspace, redirects old URLs and keeps private files inaccessible',async t=>{
 const {app}=setup(t);
 const home=await call(app,'/');assert.equal(home.status,200);assert.match(home.text,/carousel-ring/);assert.match(home.text,/Open workspace/);assert.doesNotMatch(home.text,/Coming soon/);
 assert.match(home.headers['content-security-policy'],/fonts\.googleapis\.com/);
 assert.match(home.headers['content-security-policy'],/wasm-unsafe-eval/);
 const workspace=await call(app,'/workspace');assert.equal(workspace.status,200);assert.match(workspace.text,/id="app"/);assert.match(workspace.text,/src="\/app.js"/);assert.match(workspace.headers['content-security-policy'],/fonts\.gstatic\.com/);
 assert.equal((await call(app,'/workspace',{method:'HEAD'})).text,'');
 for(const [path,target]of Object.entries({'/landing':'/','/landing/':'/','/landing/landing.html':'/','/workspace/':'/workspace','/index.html':'/workspace','/landing/signin.html':'/workspace#overview','/landing/signup.html':'/workspace#overview'})){
  const result=await call(app,path);assert.equal(result.status,308);assert.equal(result.headers.location,target);
 }
 assert.doesNotMatch((await call(app,'/api/status')).headers['content-security-policy'],/fonts\.googleapis\.com/);
 for(const path of ['/server/app.mjs','/.env','/%2e%2e/%2e%2e/etc/passwd','/api/unknown','/ml/artifacts/model.pt','/SCRAPLOOP_CHANGES.md'])assert.equal((await call(app,path)).status,404);
});

test('local classifier validates images, saves versioned suggestions and never calls a paid provider',async t=>{
 let calls=0;
 const {app}=setup(t,{fetchImpl:()=>{throw new Error('Paid provider must not run');},vision:{status:()=>({available:true}),close(){},async classify(){calls++;return{category:'metal',confidence:.91,scores:[{category:'metal',score:.91}],reviewRequired:true,needsReview:false,experimental:false,modelVersion:'fixture-v1'};}}});
 const image={name:'metal.png',mimeType:'image/png',dataBase64:Buffer.from([137,80,78,71,13,10,26,10,1]).toString('base64')};
 const result=await call(app,'/api/classify',{method:'POST',data:image});assert.equal(result.status,200);assert.equal(calls,1);assert.equal(result.json.suggestions.grade,null);assert.equal(result.json.classification.reviewRequired,true);
 const evidence=await call(app,`/api/analyses/${result.json.id}`);assert.equal(evidence.json.model,'fixture-v1');
 assert.equal((await call(app,'/api/classify',{method:'POST',data:{...image,mimeType:'application/pdf'}})).status,415);
 assert.equal((await call(app,'/api/classify',{method:'POST',data:{...image,dataBase64:'AAAA'}})).status,400);assert.equal(calls,1);
});
test('model report starts honestly empty and local worker failures are actionable',async t=>{
 const {app,dir}=setup(t,{reportPath:'/tmp/nonexistent-scraploop-report.json',vision:{status:()=>({available:false}),close(){},classify(){throw Object.assign(new Error('Install the local ML environment'),{status:503});}}});
 assert.equal((await call(app,'/api/model-report')).json.report,null);
 const result=await call(app,'/api/classify',{method:'POST',data:{name:'image.jpg',mimeType:'image/jpeg',dataBase64:Buffer.from([255,216,255,1]).toString('base64')}});
 assert.equal(result.status,503);assert.match(result.json.message,/Install/);
});

test('partial record edits preserve evidence and identity and reject invalid changes atomically',async t=>{
 const {app}=setup(t,{apiKey:'test',fetchImpl:async()=>({ok:true,json:async()=>({output_text:JSON.stringify(suggestions())})})});
 const analysis=await call(app,'/api/analyze',{method:'POST',data:file()});
 const saved=(await call(app,'/api/records',{method:'POST',data:{...record(),analysisId:analysis.json.id}})).json.record;
 const patch=data=>call(app,`/api/records/${saved.id}`,{method:'PATCH',data});
 const edited=await patch({quantityKg:12.5,confirmed:true});assert.equal(edited.status,200);assert.equal(edited.json.record.analysisId,saved.analysisId);assert.equal(edited.json.record.createdAt,saved.createdAt);assert.equal(edited.json.record.title,saved.title);assert.equal(edited.json.record.fieldReview.quantityKg,'user_confirmed');
 for(const bad of [{quantityKg:-1,confirmed:true},{title:'',confirmed:true},{analysisId:null,confirmed:true},{quantityKg:1},{fieldReview:null,confirmed:true},{latitude:20,confirmed:true}])assert.equal((await patch(bad)).status,400);
 assert.equal((await call(app,'/api/records')).json.records[0].quantityKg,12.5);
 assert.deepEqual((await call(app,`/api/analyses/${saved.analysisId}`)).json,analysis.json);
 assert.equal((await call(app,'/api/records/unknown',{method:'PATCH',data:{title:'x',confirmed:true}})).status,404);
});
test('legacy records without field metadata remain editable with unknowns preserved',async t=>{
 const {app}=setup(t);const old={id:'legacy',...record(),createdAt:'2024-01-01T00:00:00Z',analysisId:null};app.db.prepare('INSERT INTO records(id,json) VALUES (?,?)').run(old.id,JSON.stringify(old));
 const edit=await call(app,'/api/records/legacy',{method:'PATCH',data:{notes:'Reviewed again',confirmed:true}});assert.equal(edit.status,200);assert.equal(edit.json.record.createdAt,old.createdAt);assert.equal(edit.json.record.fieldReview.quantityKg,'unknown');assert.equal(edit.json.record.fieldReview.material,'user_confirmed');
});
