import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createApp } from '../server/app.mjs';
import { icon } from '../dist/icons.js';
import { planPool, scoreMatch } from '../dist/planner.js';

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
  window.__icon=icon;window.__planPool=planPool;window.__scoreMatch=scoreMatch;
  window.eval(`const icon=window.__icon;const planPool=window.__planPool;const scoreMatch=window.__scoreMatch;\n${source.replace(/^import .*;\s*$/gm,'')}`);
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

test('pool planner renders map with 3 selected factories and buyer, draws route on Pool click, and shows side panel transport shares and net profit',async t=>{
  const ui=await boot(t);await ui.route('analysis');
  await saveManual(ui,{title:'Lot A',company:'Alpha Factory',quantityKg:150,pricePerKg:40,latitude:18.52,longitude:73.85});
  await saveManual(ui,{title:'Lot B',company:'Beta Factory',quantityKg:175,pricePerKg:42,latitude:23.02,longitude:72.57});
  await saveManual(ui,{title:'Lot C',company:'Gamma Factory',quantityKg:175,pricePerKg:44,latitude:26.91,longitude:75.78});
  await ui.route('planner');
  assert.equal(ui.document.querySelectorAll('[data-marker="factory"]').length,3);
  assert.equal(ui.document.querySelectorAll('[data-marker="buyer"]').length,1);
  assert.equal(ui.document.querySelector('[data-route="pool"]'),null);
  for(const [key,value]of Object.entries({material:'PP',grade:'PP-H',quantityKg:500,comparisonPrice:75,transportCost:1200,feePercent:0}))ui.change(`#planner-form [name="${key}"]`,value);
  ui.click('[data-action="pool"]');
  assert.ok(ui.document.querySelector('[data-route="pool"]'),'Pool button draws the route');
  assert.equal(ui.document.querySelectorAll('.pool-route-segment').length,3);
  assert.match(ui.$('[data-route-summary]').textContent,/Alpha Factory → Beta Factory → Gamma Factory → Buyer destination/);
  const panel=ui.$('.planner-result');
  assert.match(panel.textContent,/500 kg/);
  assert.match(panel.textContent,/₹1,200\.00/);
  assert.match(panel.textContent,/₹15,250\.00/);
  assert.match(panel.textContent,/₹360\.00/);
  assert.match(panel.textContent,/₹420\.00/);
  assert.equal(ui.document.querySelector('[data-gap-card]'),null);
});

test('pool planner shows gap card with missing kg and nearby compatible factories when minimum order is missed or profit is negative',async t=>{
  const ui=await boot(t);await ui.route('analysis');
  await saveManual(ui,{title:'Lot 1',company:'Pune Alpha',quantityKg:180,pricePerKg:40,location:'Pune',latitude:18.52,longitude:73.85});
  await saveManual(ui,{title:'Lot 2',company:'Thane Beta',quantityKg:200,pricePerKg:42,location:'Thane',latitude:19.21,longitude:72.97});
  await saveManual(ui,{title:'Lot 3',company:'Jaipur Gamma',quantityKg:250,pricePerKg:65,location:'Jaipur',latitude:26.91,longitude:75.78});
  await ui.route('planner');
  const checkboxes=ui.document.querySelectorAll('[data-action="toggle-pool-record"]');
  assert.equal(checkboxes.length,3);
  // Exclude Thane Beta and Jaipur Gamma so only Pune Alpha (180 kg) is in the pool
  for(const box of checkboxes){
    const label=box.closest('label').textContent;
    if(label.includes('Thane Beta')||label.includes('Jaipur Gamma')){
      ui.change(`[data-action="toggle-pool-record"][data-id="${box.dataset.id}"]`,false);
    }
  }
  for(const [key,value]of Object.entries({material:'PP',grade:'PP-H',quantityKg:350,comparisonPrice:75,transportCost:1000,feePercent:0}))ui.change(`#planner-form [name="${key}"]`,value);
  ui.click('[data-action="pool"]');

  const missingCard=ui.$('[data-gap-card="missing_minimum"]');
  assert.match(missingCard.textContent,/170 kg missing/);
  assert.match(missingCard.textContent,/Thane Beta/);
  assert.match(missingCard.textContent,/200 kg available/);
  assert.match(missingCard.textContent,/Contributes 170 kg toward gap/);

  // Click "Add to pool" on Thane Beta inside the gap card to close the minimum order gap
  const addThaneBtn=missingCard.querySelector('[data-action="include-pool-record"]');
  assert.ok(addThaneBtn);
  addThaneBtn.click();
  assert.equal(ui.document.querySelector('[data-gap-card]'),null,'Gap card disappears once minimum order is met with positive profit');

  // Now set a high transport cost so the pool has negative profit while still meeting the 350 kg minimum
  ui.change('#planner-form [name="transportCost"]',15000);
  ui.click('[data-action="pool"]');
  const negProfitCard=ui.$('[data-gap-card="negative_profit"]');
  assert.match(negProfitCard.textContent,/Negative net profit/);
  assert.match(negProfitCard.textContent,/0 kg missing/);
  assert.match(negProfitCard.textContent,/Jaipur Gamma/);
});

test('AI analysis displays per-field confidence bars, shows "Needs lab test" when confidence is below 0.7, keeps unknowns blank, preserves Analyse button label, and requires human review',async t=>{
  const mockedSuggestions={
    material:'PP',
    grade:'PP-H',
    quantityKg:120.5,
    pricePerKg:null,
    company:null,
    location:null,
    condition:null,
    confidence:{material:0.92,quantityKg:0.75,grade:0.58,pricePerKg:0.45},
    evidence:[
      {field:'material',quote:'Polypropylene scrap',page:1},
      {field:'quantityKg',quote:'Net wt 120.5 kg',page:1},
      {field:'grade',quote:'Possible PP-H stamp',page:1},
    ],
    warnings:['Grade stamp is worn; price not listed on packing slip.'],
  };
  const ui=await boot(t,{apiKey:'mock-test-key',fetchImpl:async()=>({ok:true,json:async()=>({status:'completed',output_text:JSON.stringify(mockedSuggestions)})})});
  await ui.route('analysis');
  assert.equal(ui.$('[data-action="analyse"]').textContent.trim(),'Analyse');
  const file=new ui.window.File(['%PDF-1.4\nSlip'],'slip.pdf',{type:'application/pdf'});
  const input=ui.$('#analysis-file');
  Object.defineProperty(input,'files',{configurable:true,value:[file]});
  input.dispatchEvent(new ui.window.Event('change',{bubbles:true}));
  assert.equal(ui.$('[data-action="analyse"]').textContent.trim(),'Analyse');
  ui.click('[data-action="analyse"]');
  await until(()=>ui.document.querySelector('.analysis-status'),'AI confidence analysis');

  // Extracted fields populate; unknown fields remain blank (not guessed)
  assert.equal(ui.$('[name="material"]').value,'PP');
  assert.equal(ui.$('[name="quantityKg"]').value,'120.5');
  assert.equal(ui.$('[name="grade"]').value,'PP-H');
  assert.equal(ui.$('[name="pricePerKg"]').value,'');
  assert.equal(ui.$('[name="company"]').value,'');

  // All 4 extracted-field confidence bars are shown
  assert.equal(ui.document.querySelectorAll('.confidence-bar').length,4);
  assert.equal(ui.$('[data-confidence-for="material"]').dataset.confidence,'0.92');
  assert.equal(ui.$('[data-confidence-for="quantityKg"]').dataset.confidence,'0.75');
  assert.equal(ui.$('[data-confidence-for="grade"]').dataset.confidence,'0.58');
  assert.equal(ui.$('[data-confidence-for="pricePerKg"]').dataset.confidence,'0.45');

  // Only fields with confidence < 0.7 (grade at 0.58 and pricePerKg at 0.45) show "Needs lab test"
  assert.equal(ui.document.querySelector('[data-needs-lab-test="material"]'),null);
  assert.equal(ui.document.querySelector('[data-needs-lab-test="quantityKg"]'),null);
  assert.equal(ui.$('[data-needs-lab-test="grade"]').textContent,'Needs lab test');
  assert.equal(ui.$('[data-needs-lab-test="pricePerKg"]').textContent,'Needs lab test');
  assert.equal(ui.document.querySelectorAll('[data-needs-lab-test]').length,2);

  // Human review step is still required before saving
  assert.equal(ui.$('[name="confirmed"]').checked,false);
  ui.submit('#record-form');
  assert.match(ui.$('#record-error').textContent,/confirm/);
  assert.equal((await ui.api('/api/records')).records.length,0);
  ui.change('[name="confirmed"]',true);
  ui.submit('#record-form');
  await until(()=>ui.document.querySelectorAll('.record-card').length===1,'Confirmed save after confidence review');
  const saved=(await ui.api('/api/records')).records[0];
  assert.equal(saved.pricePerKg,null);
  assert.equal(saved.company,null);
});

test('every match shows an expandable "Why this buyer?" card with factor bars, plain sentences, total score as sum of factors, and "Unknown" for missing values',async t=>{
  const ui=await boot(t);await ui.route('analysis');
  // Lot 1: known coordinates ~15 km from buyer (Thane), Lot 2: unknown coordinates
  await saveManual(ui,{title:'Thane PP Lot',company:'Thane Polymers',material:'PP',grade:'PP-H',condition:'Clean',quantityKg:300,pricePerKg:40,latitude:19.18,longitude:72.97});
  await saveManual(ui,{title:'Unlocated PP Lot',company:'Unlocated Works',material:'PP',grade:'PP-H',condition:'Clean',quantityKg:200,pricePerKg:42,latitude:'',longitude:''});
  await ui.route('planner');
  for(const [key,value]of Object.entries({material:'PP',grade:'PP-H',quantityKg:500,comparisonPrice:75,transportCost:1000,feePercent:0}))ui.change(`#planner-form [name="${key}"]`,value);
  ui.click('[data-action="pool"]');

  const cards=ui.document.querySelectorAll('[data-why-buyer-card]');
  assert.equal(cards.length,2,'Each matched lot renders a Why this buyer? card');

  const firstCard=cards[0];
  const summary=firstCard.querySelector('.why-buyer-summary');
  assert.match(summary.textContent,/Why this buyer\?/);
  assert.equal(firstCard.open,false);
  summary.click();
  assert.equal(firstCard.open,true,'Clicking Why this buyer? expands the score breakdown card');

  const factorKeys=['materialFit','distance','minimumOrderFit','gradeFit','priceFit'];
  let computedSum=0;
  for(const key of factorKeys){
    assert.ok(firstCard.querySelector(`[data-why-factor="${key}"]`),`Factor ${key} is listed`);
    assert.ok(firstCard.querySelector(`[data-why-bar="${key}"]`),`Factor ${key} has a small score bar`);
    assert.ok(firstCard.querySelector(`[data-factor-sentence="${key}"]`)?.textContent.trim().length>0,`Factor ${key} has a plain sentence`);
    const scoreText=firstCard.querySelector(`[data-factor-score="${key}"]`).textContent;
    computedSum+=Number(scoreText.split('/')[0].trim());
  }
  assert.match(firstCard.querySelector('[data-factor-sentence="distance"]').textContent,/km away, within your 50 km limit/);
  assert.equal(computedSum,88);
  assert.equal(firstCard.querySelector('[data-why-total]').dataset.whyTotal,String(computedSum));
  assert.match(firstCard.querySelector('.why-buyer-footer').textContent,/88 \/ 100/);

  // Second card has unknown coordinates -> Distance is "Unknown" and not counted as good or bad
  const secondCard=cards[1];
  secondCard.querySelector('.why-buyer-summary').click();
  assert.equal(secondCard.open,true);
  const unknownDistanceRow=secondCard.querySelector('[data-why-factor="distance"]');
  assert.equal(unknownDistanceRow.dataset.factorKnown,'false');
  assert.equal(unknownDistanceRow.dataset.factorStatus,'unknown');
  assert.equal(secondCard.querySelector('[data-factor-score="distance"]').textContent,'Unknown');
  assert.match(secondCard.querySelector('[data-factor-sentence="distance"]').textContent,/Unknown/);
  // Known factors for second lot: materialFit (20) + minimumOrderFit (200/500 -> 8) + gradeFit (20) + priceFit (19) = 67 / 80
  assert.equal(secondCard.querySelector('[data-why-total]').dataset.whyTotal,'67');
  assert.match(secondCard.querySelector('.why-buyer-footer').textContent,/67 \/ 80/);
});

test('Impact dashboard calculates seller earnings, buyer savings, scrap diverted, and CO2 avoided only from saved pool plans, shows chart and animated counters respecting prefers-reduced-motion, and shows "Not enough data" when a material CO2 factor is missing',async t=>{
  const ui=await boot(t);
  let reducedMotion=false;
  ui.window.matchMedia=query=>({matches:query.includes('reduce')&&reducedMotion});

  // Public imports and unsaved material records do not inflate impact metrics
  await ui.importData();
  await ui.route('analysis');
  await saveManual(ui,{title:'PP Lot 1',company:'Pune Polymers',material:'PP',grade:'PP-H',condition:'Clean',quantityKg:200,pricePerKg:40});
  await saveManual(ui,{title:'PP Lot 2',company:'Thane Recyclers',material:'PP',grade:'PP-H',condition:'Clean',quantityKg:300,pricePerKg:44});
  await saveManual(ui,{title:'E-waste Lot',company:'Nashik E-Waste',material:'E-waste',grade:'EW-1',condition:'Clean',quantityKg:150,pricePerKg:50});

  await ui.route('impact');
  assert.equal(ui.$('[data-impact-value="seller-earnings"]').dataset.counterTarget,'0');
  assert.equal(ui.$('[data-impact-value="buyer-savings"]').dataset.counterTarget,'0');
  assert.equal(ui.$('[data-impact-value="scrap-diverted"]').dataset.counterTarget,'0');
  assert.equal(ui.$('[data-impact-value="co2-avoided"]').dataset.counterTarget,'0');
  // Separate CO2 config table shows sourced factors with estimate notes and "Not enough data" for TODO placeholders
  assert.ok(ui.document.querySelector('[data-co2-factors-panel]'));
  assert.match(ui.$('[data-co2-factor-card="PP"]').textContent,/PlasticsEurope/);
  assert.match(ui.$('[data-co2-factor-card="PP"]').textContent,/Estimate/i);
  assert.match(ui.$('[data-co2-factor-card="E-waste"]').textContent,/Not enough data/);
  assert.match(ui.$('[data-co2-factor-card="E-waste"]').textContent,/TODO:/);

  // Previewing a plan in the planner without saving does not count toward impact
  await ui.route('planner');
  for(const [key,value]of Object.entries({material:'PP',grade:'PP-H',quantityKg:500,comparisonPrice:75,transportCost:1200,feePercent:2}))ui.change(`#planner-form [name="${key}"]`,value);
  ui.click('[data-action="pool"]');
  await ui.route('impact');
  assert.equal(ui.$('[data-impact-value="seller-earnings"]').dataset.counterTarget,'0');

  // Now save the completed PP pool plan
  await ui.route('planner');
  ui.click('[data-action="save-plan"]');
  await until(async()=>(await ui.api('/api/plans')).plans.length===1,'Saved PP pool plan');

  // Navigate to Impact dashboard with prefers-reduced-motion: false -> counters animate to target
  await ui.route('impact');
  const earnedCounter=ui.$('[data-impact-value="seller-earnings"]');
  const savedCounter=ui.$('[data-impact-value="buyer-savings"]');
  const divertedCounter=ui.$('[data-impact-value="scrap-diverted"]');
  const co2Counter=ui.$('[data-impact-value="co2-avoided"]');
  assert.equal(earnedCounter.dataset.counterTarget,'21200');
  assert.equal(savedCounter.dataset.counterTarget,'14676');
  assert.equal(divertedCounter.dataset.counterTarget,'500');
  assert.equal(co2Counter.dataset.counterTarget,'675');
  assert.equal(earnedCounter.dataset.reducedMotion,'false');
  assert.equal(earnedCounter.dataset.counterAnimated,'true');
  await until(()=>earnedCounter.dataset.counterState==='complete','Animated counter completion');
  assert.match(earnedCounter.textContent,/21,200\.00/);
  assert.match(savedCounter.textContent,/14,676\.00/);
  assert.equal(divertedCounter.textContent,'500 kg');
  assert.equal(co2Counter.textContent,'675 kg CO2e');

  // Chart renders SVG bars for PP scrap diverted and CO2 avoided
  const chart=ui.$('[data-impact-chart]');
  assert.ok(chart.querySelector('svg.impact-chart-svg'));
  assert.ok(chart.querySelector('[data-chart-material="PP"] [data-chart-bar="scrap"]'));
  assert.ok(chart.querySelector('[data-chart-material="PP"] [data-chart-bar="co2"]'));

  // With prefers-reduced-motion: reduce enabled, counters skip animation and set final values immediately
  reducedMotion=true;
  await ui.route('overview');
  const overviewEarned=ui.$('[data-impact-value="seller-earnings"]');
  assert.equal(overviewEarned.dataset.reducedMotion,'true');
  assert.equal(overviewEarned.dataset.counterAnimated,'false');
  assert.equal(overviewEarned.dataset.counterState,'complete');
  assert.match(overviewEarned.textContent,/21,200\.00/);

  // Delete the PP plan and save an E-waste plan (which has a missing CO2 factor -> "Not enough data")
  ui.click('[data-action="delete-plan"]');
  await until(async()=>(await ui.api('/api/plans')).plans.length===0,'Delete PP plan');
  await ui.route('planner');
  for(const [key,value]of Object.entries({material:'E-waste',grade:'EW-1',quantityKg:150,comparisonPrice:80,transportCost:500,feePercent:0}))ui.change(`#planner-form [name="${key}"]`,value);
  ui.click('[data-action="pool"]');
  assert.match(ui.$('[data-field="co2-preview"]').textContent,/Not enough data/);
  ui.click('[data-action="save-plan"]');
  await until(async()=>(await ui.api('/api/plans')).plans.length===1,'Saved E-waste pool plan');

  await ui.route('impact');
  assert.equal(ui.$('[data-impact-value="seller-earnings"]').dataset.counterTarget,'7500');
  assert.equal(ui.$('[data-impact-value="buyer-savings"]').dataset.counterTarget,'4000');
  assert.equal(ui.$('[data-impact-value="scrap-diverted"]').dataset.counterTarget,'150');
  assert.equal(ui.$('[data-impact-value="co2-avoided"]').textContent,'Not enough data');
  assert.equal(ui.$('[data-impact-value="co2-avoided"]').dataset.co2Status,'not_enough_data');
  assert.ok(ui.document.querySelector('[data-chart-material="E-waste"] [data-chart-bar="co2-missing"]'));
});

test('Loop graph page renders SVG factory nodes and directed edges, labels compatibility rules as "demo rules", finds chains of length 2 to 4, highlights best loop by total value, makes nodes keyboard focusable, and shows inputs and outputs when a node is clicked',async t=>{
  const ui=await boot(t);
  await ui.route('loop');

  // Compatibility rules are labeled "demo rules" in the UI
  assert.equal(ui.$('[data-demo-rules-badge]').textContent.trim(),'demo rules');
  assert.equal(ui.$('[data-compatibility-rules]').dataset.rulesLabel,'demo rules');
  assert.equal(ui.$('[data-demo-rules-label]').textContent.trim(),'demo rules');
  assert.ok(ui.document.querySelectorAll('[data-compatibility-rule]').length>=7);

  // Drawn with SVG: factory nodes and directed waste-to-raw-material edges
  const svg=ui.$('svg.loop-graph-svg[data-loop-graph-svg]');
  assert.ok(svg);
  const nodes=ui.document.querySelectorAll('[data-loop-node]');
  const edges=ui.document.querySelectorAll('[data-loop-edge]');
  assert.equal(nodes.length,7);
  assert.equal(edges.length,8);

  // Chains of length 2 to 4 are found and best loop by total value is highlighted
  const chainCards=ui.document.querySelectorAll('[data-loop-chain]');
  assert.equal(chainCards.length,3);
  for(const card of chainCards){
    const len=Number(card.dataset.chainLength);
    assert.ok(len>=2&&len<=4,`Chain length ${len} is within 2..4`);
  }
  const bestBanner=ui.$('[data-best-loop]');
  assert.equal(bestBanner.dataset.bestLoopLength,'4');
  assert.equal(bestBanner.dataset.bestLoopValue,'142000');
  assert.match(bestBanner.textContent,/Pune Auto Moulders → Chakan Polymer Granulators → Thane Packaging Extruders → Nashik Compounding Works → Pune Auto Moulders/);
  assert.equal(ui.document.querySelectorAll('[data-best-loop-node="true"]').length,4);
  assert.equal(ui.document.querySelectorAll('[data-best-loop-edge="true"]').length,4);
  assert.equal(chainCards[0].dataset.isBestLoop,'true');
  assert.equal(chainCards[0].dataset.chainValue,'142000');

  // All SVG factory nodes are keyboard focusable (tabindex="0")
  for(const node of nodes){
    assert.equal(node.getAttribute('tabindex'),'0');
    assert.equal(node.getAttribute('role'),'button');
  }

  // Clicking a node shows its inputs and outputs
  assert.equal(ui.document.querySelector('[data-node-details]'),null);
  ui.click('[data-loop-node="fac-chakan-granulators"]');
  const chakanDetails=ui.$('[data-node-details="fac-chakan-granulators"]');
  assert.match(ui.$('[data-node-inspector]').textContent,/Chakan Polymer Granulators/);
  const chakanInputs=chakanDetails.querySelector('[data-node-inputs]');
  const chakanOutputs=chakanDetails.querySelector('[data-node-outputs]');
  assert.ok(chakanInputs);
  assert.ok(chakanOutputs);
  assert.match(chakanInputs.textContent,/PP Moulding Runners/);
  assert.match(chakanInputs.textContent,/Thermoform Sheet Offcuts/);
  assert.match(chakanOutputs.textContent,/Washed PP Flakes/);
  assert.match(chakanOutputs.textContent,/550 kg/);

  // Keyboard focus and Enter key activation on another node updates inputs and outputs
  const faridabadNode=ui.$('[data-loop-node="fac-faridabad-cnc"]');
  faridabadNode.focus();
  assert.equal(ui.document.activeElement,faridabadNode);
  faridabadNode.dispatchEvent(new ui.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  const faridabadDetails=ui.$('[data-node-details="fac-faridabad-cnc"]');
  assert.match(faridabadDetails.querySelector('[data-node-inputs]').textContent,/Cast Steel Blanks/);
  assert.match(faridabadDetails.querySelector('[data-node-outputs]').textContent,/Steel Turning Swarf/);
  assert.match(faridabadDetails.querySelector('[data-node-outputs]').textContent,/600 kg/);
});
