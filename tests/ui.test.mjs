import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createApp } from '../server/app.mjs';
import { icon } from '../dist/icons.js';
import { planPool } from '../dist/planner.js';

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
  const app=options.app||createApp({dbPath:':memory:',apiKey:options.apiKey||'',fetchImpl:options.fetchImpl});
  if(!options.app)t.after(()=>app.close());
  const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'http://127.0.0.1:4173/#overview',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const {window}=dom,{document}=window;
  window.scrollTo=()=>{};window.Element.prototype.scrollIntoView=()=>{};
  window.URL.createObjectURL=()=> 'blob:local-preview';window.URL.revokeObjectURL=()=>{};
  window.fetch=options.apiFailure ? async()=>({ok:false,status:503,json:async()=>({message:'Local database unavailable'})}) : (path,init)=>request(app,path,init);
  window.__icon=icon;window.__planPool=planPool;
  window.eval(`const icon=window.__icon;const planPool=window.__planPool;\n${source.replace(/^import .*;\s*$/gm,'')}`);
  t.after(()=>{window.close();assert.deepEqual(errors,[],'No application runtime errors');});
  await until(()=>document.body.dataset.ready==='true','Initial API loading');
  const $=s=>{const e=document.querySelector(s);assert.ok(e,`Missing element: ${s}`);return e;};
  const click=s=>$(s).click();
  const change=(s,value)=>{const e=$(s);if(e.type==='checkbox')e.checked=Boolean(value);else e.value=String(value);e.dispatchEvent(new window.Event('input',{bubbles:true}));e.dispatchEvent(new window.Event('change',{bubbles:true}));};
  const submit=s=>$(s).dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  const route=async name=>{window.location.hash=name;await tick();};
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

test('manual entry remains useful without an API key and requires review confirmation',async t=>{
  const ui=await boot(t);await ui.route('analysis');
  assert.match(ui.$('.analysis-actions').textContent,/Set OPENAI_API_KEY/);
  assert.equal(ui.$('[data-action="analyse"]').disabled,true);
  ui.submit('#record-form');assert.match(ui.$('#record-error').textContent,/Enter a title/);
  fillRecord(ui);ui.submit('#record-form');assert.match(ui.$('#record-error').textContent,/confirm/);
  ui.change('[name="confirmed"]',true);ui.submit('#record-form');
  await until(()=>ui.document.querySelectorAll('.record-card').length===1,'Manual save');
  const saved=(await ui.api('/api/records')).records[0];assert.equal(saved.quantityKg,120);assert.equal(saved.analysisId,null);
  ui.click('[data-action="record"]');assert.match(ui.$('.modal').textContent,/Reviewed PP stock/);assert.match(ui.$('.modal').textContent,/120 kg/);
});

test('confirmed material data persists across new UI sessions without importing browser demo records',async t=>{
  const ui=await boot(t);await ui.route('analysis');await saveManual(ui,{title:'Persistent material'});
  const fresh=await boot(t,{app:ui.app});await fresh.route('analysis');
  assert.match(fresh.$('.record-list').textContent,/Persistent material/);
  assert.equal((await fresh.api('/api/status')).recordCount,1);
  assert.equal((await fresh.api('/api/status')).facilityCount,0);
});

test('AI image analysis retrieves evidence, leaves unknowns blank, and requires review before saving',async t=>{
  let paidCalls=0;
  const suggestions={material:'PP',grade:null,quantityKg:120,pricePerKg:null,company:null,location:null,condition:null,evidence:[{field:'material',quote:'PP trimmings',page:1},{field:'quantityKg',quote:'120 kg',page:1}],warnings:['Grade was not stated.']};
  const ui=await boot(t,{apiKey:'test-key',fetchImpl:async()=>{paidCalls++;return{ok:true,json:async()=>({status:'completed',output_text:JSON.stringify(suggestions)})};}});
  await ui.route('analysis');
  const file=new ui.window.File(['%PDF-1.4\nInvoice'],'invoice.pdf',{type:'application/pdf'});
  const input=ui.$('#analysis-file');Object.defineProperty(input,'files',{configurable:true,value:[file]});input.dispatchEvent(new ui.window.Event('change',{bubbles:true}));
  assert.equal(paidCalls,0);ui.click('[data-action="analyse"]');
  await until(()=>ui.document.querySelector('.analysis-status'),'AI analysis');
  assert.equal(paidCalls,1);assert.equal(ui.$('[name="material"]').value,'PP');assert.equal(ui.$('[name="grade"]').value,'');
  assert.equal(ui.$('[name="confirmed"]').checked,false);assert.match(ui.$('.evidence-panel').textContent,/120 kg/);assert.match(ui.$('.warning-list').textContent,/Grade was not stated/);
  ui.submit('#record-form');assert.match(ui.$('#record-error').textContent,/confirm/);
  ui.change('[name="grade"]','PP-H');ui.change('[name="confirmed"]',true);ui.submit('#record-form');
  await until(()=>ui.document.querySelectorAll('.record-card').length===1,'Reviewed AI save');
  const saved=(await ui.api('/api/records')).records[0];assert.ok(saved.analysisId);assert.equal(saved.grade,'PP-H');
  ui.click('[data-action="record"]');ui.click('[data-action="view-analysis"]');
  await until(()=>ui.document.querySelector('.modal')?.textContent.includes('Original extraction evidence'),'Evidence lookup');
  assert.match(ui.$('.modal').textContent,/PP trimmings/);
});

test('invalid uploads and provider failures are surfaced without synthetic extraction',async t=>{
  const ui=await boot(t,{apiKey:'test-key',fetchImpl:async()=>({ok:false,status:429})});await ui.route('analysis');
  function upload(file){const input=ui.$('#analysis-file');Object.defineProperty(input,'files',{configurable:true,value:[file]});input.dispatchEvent(new ui.window.Event('change',{bubbles:true}));}
  upload(new ui.window.File(['text'],'bad.txt',{type:'text/plain'}));assert.match(ui.$('#toast').textContent,/Choose a JPG/);
  upload(new ui.window.File(['%PDF-1.4\nInvoice'],'invoice.pdf',{type:'application/pdf'}));ui.click('[data-action="analyse"]');
  await until(()=>ui.$('#toast').textContent.includes('usage or rate limits'),'Provider error');
  assert.equal(ui.$('[name="material"]').value,'');assert.equal(ui.document.querySelector('.analysis-status'),null);
  assert.equal((await ui.api('/api/records')).records.length,0);
});

test('record deletion requires confirmation and removes the persistent record',async t=>{
  const ui=await boot(t);await ui.route('analysis');await saveManual(ui);
  ui.click('[data-action="delete-record"]');ui.click('[data-action="close-modal"]');assert.equal((await ui.api('/api/records')).records.length,1);
  ui.click('[data-action="delete-record"]');ui.click('[data-action="confirm-delete"]');
  await until(()=>!ui.document.querySelector('.record-card'),'Record deletion');
  assert.equal((await ui.api('/api/records')).records.length,0);
});

test('planner uses confirmed material quantities rather than treating public facilities as stock',async t=>{
  const ui=await boot(t);await ui.importData();await ui.route('planner');
  for(const [key,value]of Object.entries({material:'PP',grade:'PP-H',quantityKg:100,comparisonPrice:75,transportCost:100,feePercent:0}))ui.change(`#planner-form [name="${key}"]`,value);
  ui.submit('#planner-form');assert.match(ui.$('.planner-result').textContent,/0 kg of compatible material/);assert.equal(ui.document.querySelector('.cost-row.saving'),null);
  await ui.route('analysis');await saveManual(ui);await ui.route('planner');ui.submit('#planner-form');
  assert.match(ui.$('.planner-result').textContent,/Research Team/);assert.match(ui.$('.cost-row.total').textContent,/4,300/);assert.match(ui.$('.cost-row.saving').textContent,/3,200/);
  assert.equal(ui.document.querySelector('[data-action="confirm"]'),null);
});

test('user-provided titles and notes remain text rather than executable markup',async t=>{
  const ui=await boot(t);await ui.route('analysis');const payload='<img src=x onerror="window.__injected=1">';await saveManual(ui,{title:payload});
  assert.equal(ui.document.querySelector('img[src="x"]'),null);assert.match(ui.$('.record-list').textContent,/<img src=x/);
  ui.click('[data-action="record"]');assert.equal(ui.document.querySelector('img[src="x"]'),null);assert.equal(ui.window.__injected,undefined);
});

test('API failures show a recovery path rather than falling back to sample factories',async t=>{
  const ui=await boot(t,{apiFailure:true});assert.match(ui.$('#main').textContent,/Local database unavailable/);assert.ok(ui.document.querySelector('[data-action="refresh"]'));assert.equal(ui.document.querySelector('.facility-row'),null);
});
