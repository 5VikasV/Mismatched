import {renderLoop} from "../dist/shared/loop.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createApp } from '../server/app.mjs';
import { icon } from '../dist/icons.js';
import { planPool } from '../dist/planner.js';
import { mountFeature as mountAnalysis } from '../dist/features/analysis.js';
import { mountFeature as mountDirectory } from '../dist/features/directory.js';
import { mountFeature as mountPlanner } from '../dist/features/planner.js';
import { mountFeature as mountEvidence } from '../dist/features/evidence.js';
import { mountFeature as mountResults } from '../dist/features/results.js';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
async function until(check, message = 'UI condition') {
  for (let i=0; i<100; i++) { if (check()) return; await tick(); }
  assert.fail(`${message} did not become ready`);
}
async function request(app, path, init={}) {
  const req = Readable.from(init.body ? [Buffer.from(init.body)] : []);
  req.url = String(path); req.method = init.method || 'GET';
  req.headers = {host:'127.0.0.1:4173', origin:'http://127.0.0.1:4173', ...Object.fromEntries(Object.entries(init.headers||{}).map(([k,v])=>[k.toLowerCase(),v]))};
  const result={status:0,headers:{},body:''};
  const res={headersSent:false,setHeader(k,v){result.headers[k.toLowerCase()]=v;},writeHead(s,h={}){result.status=s;this.headersSent=true;for(const[k,v]of Object.entries(h))this.setHeader(k,v);},end(value){result.body=value?.toString()||'';}};
  await app.handle(req,res);
  return {ok:result.status>=200&&result.status<300,status:result.status,json:async()=>JSON.parse(result.body),text:async()=>result.body};
}
async function boot(t, options={}) {
  const app=options.app||createApp({dbPath:':memory:',apiKey:options.apiKey||'',fetchImpl:options.fetchImpl,vision:options.vision});
  if(!options.app)t.after(()=>app.close());
  const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'http://127.0.0.1:4173/workspace#overview',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const {window}=dom,{document}=window;
  window.scrollTo=()=>{};window.Element.prototype.scrollIntoView=()=>{};
  window.URL.createObjectURL=()=> 'blob:local-preview';window.URL.revokeObjectURL=()=>{};
  window.fetch=options.apiFailure ? async()=>({ok:false,status:503,json:async()=>({message:'Local database unavailable'})}) : (path,init)=>request(app,path,init);
  window.__features={evidence:async()=>({mountFeature:mountEvidence}),directory:async()=>({mountFeature:mountDirectory}),planner:async()=>({mountFeature:mountPlanner}),analysis:async()=>({mountFeature:mountAnalysis}),results:async()=>({mountFeature:mountResults})};
  window.__renderLoop=renderLoop;
  window.__icon=icon;window.__planPool=planPool;
  window.eval(`const renderLoop=window.__renderLoop;const mountMaterialLoop=()=>()=>{};const icon=window.__icon;const planPool=window.__planPool;\n${source.replace(/^import .*;\s*$/gm,'')}`);
  t.after(()=>{window.close();assert.deepEqual(errors,[],'No application runtime errors');});
  await until(()=>document.body.dataset.ready==='true','Initial API loading');
  const $=s=>{const e=document.querySelector(s);assert.ok(e,`Missing element: ${s}`);return e;};
  const click=s=>$(s).click();
  const change=(s,value)=>{const e=$(s);if(e.type==='checkbox')e.checked=Boolean(value);else e.value=String(value);e.dispatchEvent(new window.Event('input',{bubbles:true}));e.dispatchEvent(new window.Event('change',{bubbles:true}));};
  const submit=s=>$(s).dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  const route=async name=>{window.location.hash=name;await tick();if(name==='sources'||name==='evidence')await until(()=>document.querySelector('#emissions-form'),'Evidence feature');if(name==='directory')await until(()=>document.querySelector('[data-feature="directory"] .directory-view'),'Directory feature');if(name==='analysis')await until(()=>document.querySelector('#record-form'),'Analysis feature');if(name==='planner')await until(()=>document.querySelector('#planner-form'),'Planner feature');};
  const api=async(path,method='GET',data)=>{const response=await request(app,path,{method,headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});return response.json();};
  const importData=async()=>{click('[data-action="import"]');await until(()=>document.querySelector('.workflow-links')?.textContent.includes('40 records to explore') || document.querySelector('.section-heading h2')?.textContent.includes('40') || document.querySelector('.data-totals strong')?.textContent==='40','Public import');};
  return{app,window,document,$,click,change,submit,route,api,importData};
}
function fillRecord(ui, values={}) {
  const fields={title:'Reviewed PP stock',company:'Research Team',material:'PP',grade:'PP-H',condition:'Clean',quantityKg:120,pricePerKg:42,...values};
  for(const [key,value]of Object.entries(fields))ui.change(`#record-form [name="${key}"]`,value);
}
async function saveManual(ui, values={}) {
  fillRecord(ui,values);ui.change('[name="confirmed"]',true);ui.submit('#record-form');
  await until(()=>ui.document.querySelectorAll('.record-card').length>0,'Saved material record');
}

test('first launch is empty and offers evidence with legacy source route alias',async t=>{
  const ui=await boot(t);assert.equal((await ui.api('/api/status')).facilityCount,0);
  assert.equal(ui.document.querySelectorAll('.market-stat').length,3);
  assert.match(ui.$('.market-cards').textContent,/5.16 MMT/);
  assert.match(ui.$('.market-context-note').textContent,/Illustrative market estimates/);
  assert.equal(ui.document.querySelector('.desk-metrics'),null);
  assert.equal(ui.document.querySelector('[data-action="guided"]'),null);
  assert.equal(ui.document.querySelector('[data-action="reset"]'),null);
  assert.match(ui.$('#main').textContent,/Build your local loop/);
  await ui.route('sources');assert.equal(ui.window.location.hash,'#evidence');
  assert.equal(ui.document.querySelectorAll('.evidence-case').length,6);
  assert.doesNotMatch(ui.$('#main').textContent,/OPENAI_API_KEY/);
});

test('explicit public import loads attributable real records and supports state and text filters',async t=>{
  const ui=await boot(t);await ui.importData();
  assert.equal((await ui.api('/api/status')).facilityCount,40);
  await ui.route('directory');assert.equal(ui.document.querySelectorAll('.facility-row').length,40);
  ui.change('#directory-state','Rajasthan');assert.equal(ui.document.querySelectorAll('.facility-row').length,10);
  ui.change('#directory-search','unlikely-no-match');assert.equal(ui.document.querySelectorAll('.facility-row').length,0);
  ui.click('[data-action="clear-filters"]');assert.equal(ui.document.querySelectorAll('.facility-row').length,40);
  ui.click('[data-action="select-facility"]');assert.ok(ui.document.querySelector('.facility-detail-card'));
  assert.match(ui.$('.facility-detail-card').textContent,/source/i);
  assert.match(ui.$('.facility-detail-card a').href,/^https?:\/\//);
  ui.click('[data-action="deselect-facility"]');
  ui.click('[data-action="view"][data-view="map"]');
  assert.match(ui.$('.directory-map-container').textContent,/coordinates/);
  await ui.route('sources');assert.equal(ui.document.querySelectorAll('.evidence-case').length,6);
  assert.equal((await ui.api('/api/sources')).sources.length,3);
});

test('manual records save, reopen, edit and retain their original ID',async t=>{
 const ui=await boot(t);await ui.route('analysis');
 ui.submit('#record-form');assert.match(ui.$('#record-error').textContent,/title/);
 fillRecord(ui);ui.submit('#record-form');assert.match(ui.$('#record-error').textContent,/confirm/);
 ui.change('[name="confirmed"]',true);ui.submit('#record-form');await until(()=>ui.document.querySelector('.record-card'),'Manual save');
 const original=(await ui.api('/api/records')).records[0];assert.equal(original.fieldReview.material,'user_confirmed');
 ui.click('[data-feature-action="edit"]');ui.change('[name="quantityKg"]',125);assert.equal(ui.$('[name="confirmed"]').checked,false);
 ui.change('[name="confirmed"]',true);ui.submit('#record-form');await until(()=>ui.document.querySelector('.record-card')?.textContent.includes('125'),'Edit save');
 const edited=(await ui.api('/api/records')).records[0];assert.equal(edited.id,original.id);assert.equal(edited.createdAt,original.createdAt);assert.equal(edited.quantityKg,125);
});

test('local photo suggestions require review and never fabricate grade, condition or prices',async t=>{
 let calls=0;const ui=await boot(t,{vision:{status:()=>({available:true}),close(){},async classify(){calls++;return{category:'plastic',confidence:.92,scores:[{category:'plastic',score:.92}],reviewRequired:true,needsReview:false,experimental:false,modelVersion:'test-v1'};}}});
 await ui.route('analysis');
 const upload=new ui.window.File([new Uint8Array([137,80,78,71,13,10,26,10,1])],'scrap.png',{type:'image/png'});
 const input=ui.$('#analysis-file');Object.defineProperty(input,'files',{value:[upload],configurable:true});input.dispatchEvent(new ui.window.Event('change',{bubbles:true}));
 ui.click('[data-feature-action="analyse"]');await until(()=>ui.document.querySelector('.analysis-status'),'Local analysis');
 assert.equal(calls,1);assert.equal(ui.$('[name="material"]').value,'plastic');assert.equal(ui.$('[name="grade"]').value,'');assert.equal(ui.$('[name="condition"]').value,'');assert.equal(ui.$('[name="pricePerKg"]').value,'');assert.match(ui.$('[data-review="material"]').textContent,/AI suggestion/);assert.equal(ui.$('[name="confirmed"]').checked,false);
 ui.change('[name="confirmed"]',true);ui.submit('#record-form');await until(()=>ui.document.querySelector('.record-card'),'Reviewed save');
 ui.click('[data-feature-action="edit"]');await until(()=>ui.document.querySelector('.analysis-status'),'Original evidence');assert.match(ui.$('.evidence-panel').textContent,/test-v1/);
});

test('late classification cannot replace a new draft and failures preserve manual input',async t=>{
 let finish;const ui=await boot(t,{vision:{status:()=>({available:true}),close(){},classify(){return new Promise(resolve=>finish=resolve);}}});await ui.route('analysis');
 const input=ui.$('#analysis-file');Object.defineProperty(input,'files',{value:[new ui.window.File([new Uint8Array([255,216,255,1])],'one.jpg',{type:'image/jpeg'})]});input.dispatchEvent(new ui.window.Event('change',{bubbles:true}));
 ui.click('[data-feature-action="analyse"]');await until(()=>finish,'Pending classifier');ui.click('[data-feature-action="new"]');ui.change('[name="title"]','Keep this draft');
 finish({category:'metal',confidence:.8,scores:[],modelVersion:'late'});await tick();await tick();assert.equal(ui.$('[name="title"]').value,'Keep this draft');assert.equal(ui.$('[name="material"]').value,'');
});

test('saved search escapes markup and deletion requires an explicit second action',async t=>{
 const ui=await boot(t);await ui.route('analysis');const title='<img src=x onerror="window.__injected=1">';await saveManual(ui,{title});assert.equal(ui.document.querySelector('img[src="x"]'),null);
 ui.change('#record-search','no matches');assert.equal(ui.document.querySelector('.record-card'),null);ui.change('#record-search','');
 ui.click('[data-feature-action="delete"]');assert.equal((await ui.api('/api/records')).records.length,1);ui.click('[data-feature-action="cancel-delete"]');assert.equal((await ui.api('/api/records')).records.length,1);
 ui.click('[data-feature-action="delete"]');ui.click('[data-feature-action="confirm-delete"]');await until(()=>!ui.document.querySelector('.record-card'),'Delete');assert.equal((await ui.api('/api/records')).records.length,0);
});

test('API failures show recovery without sample factories',async t=>{
 const ui=await boot(t,{apiFailure:true});assert.match(ui.$('#main').textContent,/Local database unavailable/);assert.ok(ui.document.querySelector('[data-action="refresh"]'));assert.equal(ui.document.querySelector('.facility-row'),null);
});

test('integrated planner uses saved records, selection and full costs',async t=>{
 const ui=await boot(t);await ui.route('analysis');await saveManual(ui);await ui.route('planner');
 for(const [key,value]of Object.entries({material:'PP',quantityKg:100,comparisonPrice:75}))ui.change(`#planner-form [name="${key}"]`,value);
 ui.submit('#planner-form');ui.change('[data-pickup-field=provider]','external');ui.change('[data-pickup-field=payer]','buyer');ui.change('[data-pickup-field=cost]','100');ui.click('[data-plan-action=apply]');assert.match(ui.$('.planner-result').textContent,/Research Team/);assert.match(ui.$('.cost-row.total').textContent,/4,447/);assert.match(ui.$('.cost-row.saving').textContent,/3,053/);
 ui.click('[data-plan-action="none"]');assert.match(ui.$('.planner-result').textContent,/100 kg shortfall/);assert.equal(ui.$('[data-plan-action="export"]').disabled,true);
 ui.click('[data-plan-action="all"]');assert.equal(ui.$('[data-plan-action="export"]').disabled,false);
});
test('model results show real report metrics and explicit limitations',async t=>{
 const ui=await boot(t);await ui.route('results');await until(()=>ui.document.querySelector('table'),'Report');assert.match(ui.$('#main').textContent,/Frozen feature prototypes/);assert.match(ui.$('#main').textContent,/expert-confirmed factory/);assert.match(ui.$('#main').textContent,/Confusion matrix/);
});

test('model comparison shows previous metrics and a decrease honestly without claiming a new benchmark',async t=>{
 const report=JSON.parse(await readFile(new URL('../reports/model/latest.json',import.meta.url),'utf8'));
 report.previousModel={trained:structuredClone(report.trained)};
 report.previousModel.trained.test.accuracy=.90;
 report.trained.test.accuracy=.88;
 report.comparison={testAccuracyPercentagePointChange:-2};
 const dom=new JSDOM('<main></main>');t.after(()=>dom.window.close());
 const root=dom.window.document.querySelector('main');
 await mountResults(root,{api:async()=>({report})});
 const row=[...root.querySelectorAll('tr')].find(row=>row.textContent.includes('Previous installed specialist'));
 assert.ok(row);assert.match(row.textContent,/90.0%/);
 assert.match(root.textContent,/-2.0 percentage points/);
 assert.match(root.textContent,/not an independent factory benchmark/);
 assert.match(root.textContent,/selected using validation data/);
});

test('retry after a post-save refresh failure edits the committed record instead of duplicating it',async t=>{
 const ui=await boot(t);await ui.route('analysis');fillRecord(ui,{title:'One committed record'});ui.change('[name="confirmed"]',true);
 const originalFetch=ui.window.fetch;let failRefresh=false;
 ui.window.fetch=async(path,init)=>{
  if(path==='/api/status'&&failRefresh)return{ok:false,status:503,json:async()=>({message:'Temporary refresh failure'})};
  const response=await originalFetch(path,init);
  if(path==='/api/records'&&init?.method==='POST'&&response.ok)failRefresh=true;
  return response;
 };
 ui.submit('#record-form');await until(()=>ui.document.querySelector('#record-error')?.textContent.includes('Temporary refresh failure'),'Failed refresh');
 const created=(await ui.api('/api/records')).records;assert.equal(created.length,1);
 assert.match(ui.$('#record-form button[type="submit"]').textContent,/Save changes/);
 failRefresh=false;ui.submit('#record-form');await until(()=>ui.document.querySelector('.record-card'),'Refresh recovery');
 const after=(await ui.api('/api/records')).records;assert.equal(after.length,1);assert.equal(after[0].id,created[0].id);
});

function uploadAnalysisFile(ui, filename='sample.pdf', type='application/pdf') {
 const file = new ui.window.File([type==='application/pdf'?'%PDF-1.4\nfixture':new Uint8Array([255,216,255,1])],filename,{type});
 const input=ui.$('#analysis-file');Object.defineProperty(input,'files',{value:[file],configurable:true});input.dispatchEvent(new ui.window.Event('change',{bubbles:true}));
}
function pdfSuggestions(){
 const values={company:'Test PDF Factory',material:'PP',grade:'PP-H',condition:'Clean',quantityKg:1200,pricePerKg:42,location:'Pune, India'};
 return {...values,evidence:Object.entries(values).map(([field,value])=>({field,quote:`${field}: ${value}`,page:1})),warnings:['Fixture declarations require review.']};
}
test('main Analyse routes PDFs to the configured API and autofills supported fields without local ML or saving',async t=>{
 let calls=0;
 const ui=await boot(t,{apiKey:'fake-test-key',vision:{status:()=>({available:false}),close(){},classify(){throw new Error('PDF must not use local ML');}},fetchImpl:async(_url,init)=>{
  calls++;const body=JSON.parse(init.body);assert.equal(body.input[0].content[1].type,'input_file');return{ok:true,json:async()=>({output_text:JSON.stringify(pdfSuggestions())})};
 }});
 await ui.route('analysis');uploadAnalysisFile(ui);
 assert.equal(calls,0,'Upload alone never calls the provider');
 assert.equal(ui.$('[data-feature-action="analyse"]').disabled,false);
 assert.match(ui.$('#analysis-engine').textContent,/PDF.*AI document/);
 ui.change('[name="quantityKg"]',20);ui.change('[name="pricePerKg"]',50000);
 ui.click('[data-feature-action="analyse"]');await until(()=>ui.document.querySelector('.analysis-status'),'PDF extraction');
 assert.equal(calls,1);assert.equal(ui.$('[name="quantityKg"]').value,'1200');assert.equal(ui.$('[name="pricePerKg"]').value,'42');
 assert.equal(ui.$('[name="material"]').value,'PP');assert.equal(ui.$('[name="latitude"]').value,'');
 assert.match(ui.$('[data-review="quantityKg"]').textContent,/AI suggestion/);assert.equal(ui.$('[name="confirmed"]').checked,false);
 assert.equal((await ui.api('/api/records')).records.length,0);
});
test('file autofill preserves edits made during analysis and supports keeping existing entries',async t=>{
 let release;
 const ui=await boot(t,{apiKey:'fake-key',fetchImpl:()=>new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({output_text:JSON.stringify(pdfSuggestions())})});})});
 await ui.route('analysis');uploadAnalysisFile(ui);
 ui.change('[name="company"]','Keep this company');ui.change('#replace-existing',false);
 ui.click('[data-feature-action="autofill"]');await until(()=>release,'Provider pending');
 ui.change('[name="quantityKg"]',77);release();await until(()=>ui.document.querySelector('.analysis-status'),'Extraction result');
 assert.equal(ui.$('[name="company"]').value,'Keep this company');assert.equal(ui.$('[name="quantityKg"]').value,'77');assert.equal(ui.$('[name="material"]').value,'PP');
});
test('sample fill makes no API call or saved record and missing PDF configuration explains the disabled action',async t=>{
 const ui=await boot(t,{fetchImpl(){throw new Error('Sample fill must never call provider');}});await ui.route('analysis');uploadAnalysisFile(ui);
 assert.equal(ui.$('[data-feature-action="analyse"]').disabled,true);assert.match(ui.$('#provider-disclosure').textContent,/requires.*API key/);
 ui.click('[data-feature-action="sample"]');
 assert.match(ui.$('[name="title"]').value,/SAMPLE/);assert.equal(ui.$('[name="quantityKg"]').value,'1200');assert.equal(ui.$('[name="pricePerKg"]').value,'42');assert.equal(ui.$('[name="latitude"]').value,'');
 assert.match(ui.$('[data-review="material"]').textContent,/Sample value/);assert.equal(ui.$('[name="confirmed"]').checked,false);assert.equal((await ui.api('/api/records')).records.length,0);
 uploadAnalysisFile(ui,'real.pdf');assert.equal(ui.$('[name="material"]').value,'');assert.equal(ui.document.querySelector('.lab-evidence-note'),null,'Real upload clears sample data');
});
test('replacement permission does not overwrite a field edited during an in-flight request',async t=>{
 let release;const ui=await boot(t,{apiKey:'fake-key',fetchImpl:()=>new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({output_text:JSON.stringify(pdfSuggestions())})});})});
 await ui.route('analysis');uploadAnalysisFile(ui);ui.change('[name="quantityKg"]',20);ui.click('[data-feature-action="analyse"]');await until(()=>release,'Pending extraction');
 ui.change('[name="quantityKg"]',99);release();await until(()=>ui.document.querySelector('.analysis-status'),'Extracted');assert.equal(ui.$('[name="quantityKg"]').value,'99');assert.equal(ui.$('[name="pricePerKg"]').value,'42');
});

test('photos use local ML by default and API text extraction only when explicitly selected',async t=>{
 let localCalls=0,apiCalls=0;
 const ui=await boot(t,{apiKey:'fake-key',vision:{status:()=>({available:true}),close(){},async classify(){localCalls++;return{category:'plastic',confidence:.9,scores:[],modelVersion:'test-local',needsReview:false};}},fetchImpl:async(_url,init)=>{apiCalls++;assert.equal(JSON.parse(init.body).input[0].content[1].type,'input_image');return{ok:true,json:async()=>({output_text:JSON.stringify(pdfSuggestions())})};}});
 await ui.route('analysis');uploadAnalysisFile(ui,'invoice.jpg','image/jpeg');ui.click('[data-feature-action="analyse"]');await until(()=>ui.document.querySelector('.analysis-status'),'Photo classification');
 assert.equal(localCalls,1);assert.equal(apiCalls,0);assert.equal(ui.$('[name="quantityKg"]').value,'');
 ui.click('[data-feature-action="document"]');await until(()=>ui.$('[name="quantityKg"]').value==='1200','Photo text extraction');assert.equal(apiCalls,1);assert.equal(localCalls,1);
});

test('planner derives grade from reviewed lots without a buyer grade input and keeps grades separate',async t=>{
 const ui=await boot(t);await ui.route('analysis');
 await saveManual(ui,{title:'Grade H lot',grade:'PP-H',quantityKg:120,pricePerKg:42});
 ui.click('[data-feature-action="new"]');await saveManual(ui,{title:'Grade B lot',grade:'PP-B',quantityKg:200,pricePerKg:39});
 await until(()=>ui.document.querySelector('.record-list')?.textContent.includes('Grade B lot'),'Second saved lot');
 const records=(await ui.api('/api/records')).records;
 const h=records.find(r=>r.title==='Grade H lot'),b=records.find(r=>r.title==='Grade B lot');
 await ui.route('planner');assert.equal(ui.document.querySelector('#planner-form [name="grade"]'),null);
 for(const [key,value]of Object.entries({material:'PP',quantityKg:200,comparisonPrice:75}))ui.change(`#planner-form [name="${key}"]`,value);
 ui.submit('#planner-form');
 assert.match(ui.$('#pool-grade-note').textContent,/PP-B/);
 assert.equal(ui.$(`[name="lot"][value="${b.id}"]`).checked,true);
 assert.equal(ui.$(`[name="lot"][value="${h.id}"]`).checked,false);
 ui.change(`[name="lot"][value="${h.id}"]`,true);
 assert.match(ui.$('#pool-grade-note').textContent,/PP-H/);
 assert.equal(ui.$(`[name="lot"][value="${b.id}"]`).checked,false);
 assert.match(ui.$('.planner-result').textContent,/80 kg shortfall/);
 ui.click('[data-plan-action="all"]');assert.equal(ui.$(`[name="lot"][value="${b.id}"]`).checked,false);
});

test('empty planner explains missing supply and reviewed test lot unlocks transport calculations',async t=>{
 const ui=await boot(t);await ui.route('planner');
 for(const [key,value]of Object.entries({material:'PP',quantityKg:500,comparisonPrice:75}))ui.change(`#planner-form [name="${key}"]`,value);
 ui.submit('#planner-form');assert.match(ui.$('#planner-feedback').textContent,/No saved material lots/);
 assert.equal(ui.$('[data-plan-action="apply"]').disabled,true);assert.equal((await ui.api('/api/records')).records.length,0);
 ui.click('[data-plan-action="sample-open"]');assert.equal(ui.$('[data-plan-action="sample-add"]').disabled,true);
 assert.equal((await ui.api('/api/records')).records.length,0);
 ui.change('#confirm-planner-sample',true);ui.click('[data-plan-action="sample-add"]');
 await until(()=>ui.document.querySelector('[data-pickup]'),'Allocated test material');
 assert.equal((await ui.api('/api/records')).records.length,1);assert.match((await ui.api('/api/records')).records[0].notes,/FICTIONAL TEST DATA/);
 assert.match(ui.$('.planner-result').textContent,/500 \/ 500 kg/);
 ui.click('[data-plan-action="apply"]');assert.match(ui.$('#planner-feedback').textContent,/incomplete/);
 ui.change('[data-pickup-field="provider"]','external');ui.change('[data-pickup-field="payer"]','buyer');ui.change('[data-pickup-field="cost"]',1000);ui.click('[data-plan-action="apply"]');
 assert.match(ui.$('#planner-feedback').textContent,/Transport totals updated/);assert.match(ui.$('.cost-row.total').textContent,/22,735/);assert.match(ui.$('.cost-row.saving').textContent,/14,765/);
 assert.equal(ui.$('[data-plan-action="review"]').disabled,false);
});
test('planner test-lot retry after a refresh failure never creates a second copy',async t=>{
 const ui=await boot(t);await ui.route('planner');const originalFetch=ui.window.fetch;let rejectRefresh=true,posts=0;
 ui.window.fetch=async(path,init)=>{
  if(path==='/api/records'&&init?.method==='POST')posts++;
  if(path==='/api/status'&&rejectRefresh){rejectRefresh=false;return{ok:false,json:async()=>({message:'Temporary refresh failure'})};}
  return originalFetch(path,init);
 };
 ui.click('[data-plan-action="sample-open"]');ui.change('#confirm-planner-sample',true);ui.click('[data-plan-action="sample-add"]');
 await until(()=>ui.document.querySelector('.planner-result .error-message')?.textContent.includes('reloading failed'),'Saved-but-refresh-failed status');
 assert.equal((await ui.api('/api/records')).records.length,1);ui.click('[data-plan-action="sample-add"]');await until(()=>ui.document.querySelector('[data-pickup]'),'Retried refresh');
 assert.equal(posts,1);assert.equal((await ui.api('/api/records')).records.length,1);
});
test('planner validates requirements and distinguishes an empty size filter from missing supply',async t=>{
 const ui=await boot(t);await ui.route('planner');ui.submit('#planner-form');assert.match(ui.$('#planner-feedback').textContent,/Enter the material/);
 ui.change('#planner-form [name="material"]','PP');ui.change('#planner-form [name="quantityKg"]',500);ui.change('#planner-form [name="comparisonPrice"]',75);ui.change('#planner-form [name="buyerLatitude"]',2);ui.submit('#planner-form');assert.match(ui.$('#planner-feedback').textContent,/both buyer coordinates/);
 ui.change('#planner-form [name="buyerLatitude"]','');ui.click('[data-plan-action="sample-open"]');ui.change('#confirm-planner-sample',true);ui.click('[data-plan-action="sample-add"]');await until(()=>ui.document.querySelector('[data-pickup]'),'Test record');
 ui.click('[data-plan-action="band"][data-band="bulk"]');assert.match(ui.$('.planner-empty').textContent,/No saved lots in this quantity band/);ui.click('.planner-empty [data-plan-action="band"]');assert.equal(ui.document.querySelectorAll('.lot-option').length,1);
});
