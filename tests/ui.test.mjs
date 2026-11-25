import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createApp } from '../server/app.mjs';
import { icon } from '../dist/icons.js';
import { planPool } from '../dist/planner.js';
import { mountFeature as mountAnalysis } from '../dist/features/analysis.js';
import { mountFeature as mountPlanner } from '../dist/features/planner.js';
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
  const dom=new JSDOM(html,{url:'http://127.0.0.1:4173/#overview',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const {window}=dom,{document}=window;
  window.scrollTo=()=>{};window.Element.prototype.scrollIntoView=()=>{};
  window.URL.createObjectURL=()=> 'blob:local-preview';window.URL.revokeObjectURL=()=>{};
  window.fetch=options.apiFailure ? async()=>({ok:false,status:503,json:async()=>({message:'Local database unavailable'})}) : (path,init)=>request(app,path,init);
  window.__features={planner:async()=>({mountFeature:mountPlanner}),analysis:async()=>({mountFeature:mountAnalysis}),results:async()=>({mountFeature:mountResults})};
  window.__icon=icon;window.__planPool=planPool;
  window.eval(`const mountMaterialLoop=()=>()=>{};const icon=window.__icon;const planPool=window.__planPool;\n${source.replace(/^import .*;\s*$/gm,'')}`);
  t.after(()=>{window.close();assert.deepEqual(errors,[],'No application runtime errors');});
  await until(()=>document.body.dataset.ready==='true','Initial API loading');
  const $=s=>{const e=document.querySelector(s);assert.ok(e,`Missing element: ${s}`);return e;};
  const click=s=>$(s).click();
  const change=(s,value)=>{const e=$(s);if(e.type==='checkbox')e.checked=Boolean(value);else e.value=String(value);e.dispatchEvent(new window.Event('input',{bubbles:true}));e.dispatchEvent(new window.Event('change',{bubbles:true}));};
  const submit=s=>$(s).dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  const route=async name=>{window.location.hash=name;await tick();if(name==='analysis')await until(()=>document.querySelector('#record-form'),'Analysis feature');if(name==='planner')await until(()=>document.querySelector('#planner-form'),'Planner feature');};
  const api=async(path,method='GET',data)=>{const response=await request(app,path,{method,headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});return response.json();};
  const importData=async()=>{click('[data-action="import"]');await until(()=>document.querySelector('.metric strong')?.textContent==='40' || document.querySelector('.section-heading h2')?.textContent.includes('40') || document.querySelector('.data-totals strong')?.textContent==='40','Public import');};
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

test('first launch is empty and offers explicit public-data and OpenAI setup without old demo state',async t=>{
  const ui=await boot(t);assert.equal((await ui.api('/api/status')).facilityCount,0);
  assert.match(ui.$('.metric-strip').textContent,/0Public facility records/);
  assert.equal(ui.document.querySelector('[data-action="guided"]'),null);
  assert.equal(ui.document.querySelector('[data-action="reset"]'),null);
  assert.match(ui.$('#main').textContent,/Start with the source/);
  await ui.route('sources');assert.match(ui.$('#main').textContent,/OPENAI_API_KEY/);
  assert.match(ui.$('#main').textContent,/Not configured/);
});

test('explicit public import loads attributable real records and supports state and text filters',async t=>{
  const ui=await boot(t);await ui.importData();
  assert.equal((await ui.api('/api/status')).facilityCount,40);
  await ui.route('directory');assert.equal(ui.document.querySelectorAll('.facility-row').length,40);
  ui.change('#state-filter','Rajasthan');assert.equal(ui.document.querySelectorAll('.facility-row').length,10);
  ui.change('#directory-search','unlikely-no-match');assert.equal(ui.document.querySelectorAll('.facility-row').length,0);
  ui.click('[data-action="clear-filters"]');assert.equal(ui.document.querySelectorAll('.facility-row').length,40);
  ui.click('[data-action="facility"]');assert.ok(ui.document.querySelector('[role="dialog"]'));
  assert.match(ui.$('.modal').textContent,/Read original source/);assert.match(ui.$('.modal').textContent,/Not supplied by the source/);
  assert.match(ui.$('.modal a').href,/^https?:\/\//);
  ui.click('[data-action="close-modal"]');
  ui.click('[data-action="view"][data-view="map"]');
  assert.match(ui.$('.directory-map').textContent,/No reliable facility coordinates/);
  await ui.route('sources');assert.equal(ui.document.querySelectorAll('.source-card').length,3);
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
 for(const [key,value]of Object.entries({material:'PP',grade:'PP-H',quantityKg:100,comparisonPrice:75,transportCost:100,feePercent:0}))ui.change(`#planner-form [name="${key}"]`,value);
 ui.submit('#planner-form');assert.match(ui.$('.planner-result').textContent,/Research Team/);assert.match(ui.$('.cost-row.total').textContent,/4,300/);assert.match(ui.$('.cost-row.saving').textContent,/3,200/);
 ui.click('[data-plan-action="none"]');assert.match(ui.$('.planner-result').textContent,/100 kg shortfall/);assert.equal(ui.$('[data-plan-action="export"]').disabled,true);
 ui.click('[data-plan-action="all"]');assert.equal(ui.$('[data-plan-action="export"]').disabled,false);
});
test('model results show real report metrics and explicit limitations',async t=>{
 const ui=await boot(t);await ui.route('results');await until(()=>ui.document.querySelector('table'),'Report');assert.match(ui.$('#main').textContent,/Frozen feature prototypes/);assert.match(ui.$('#main').textContent,/expert-confirmed factory/);assert.match(ui.$('#main').textContent,/Confusion matrix/);
});
