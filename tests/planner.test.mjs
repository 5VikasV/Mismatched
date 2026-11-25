import test from 'node:test';
import assert from 'node:assert/strict';
import { planPool as calculate } from '../dist/planner.js';

// Transport fixtures explicitly choose a provider/payer for every allocated lot.
const planPool=(records,req)=>{const base=calculate(records,req);return calculate(records,{...req,pickups:base.allocations.map((a,i)=>({recordId:a.recordId,provider:'external',payer:'buyer',cost:i===0?(req.transportCost??0):0,zeroCostConfirmed:i!==0||!req.transportCost}))});};

const record=(id,quantityKg,pricePerKg,changes={})=>({id,title:`Research ${id}`,company:'Test factory',confirmed:true,material:'PP',grade:'PP-H',condition:'Clean',quantityKg,pricePerKg,...changes});
const need=changes=>({material:'PP',grade:'PP-H',quantityKg:500,comparisonPrice:75,transportCost:1200,feePercent:2,...changes});

test('planning uses confirmed records and full delivered cost',()=>{
 const result=planPool([record('a',120,42),record('b',180,44),record('c',200,43)],need());
 assert.equal(result.viable,true);assert.equal(result.quantityKg,500);assert.equal(result.materialCost,21560);
 assert.equal(result.fee,1078);assert.equal(result.buyerFee,754.6);assert.equal(result.totalCost,23514.6);assert.equal(result.savings,13985.4);
 assert.equal(result.allocations.length,3);
});
test('missing, incompatible, unconfirmed and unpriced records never become assumed supply',()=>{
 const records=[record('unknown',null,null),record('wrong-grade',500,20,{grade:null}),record('wrong-material',500,20,{material:'HDPE'}),record('mixed',500,20,{condition:'Mixed'}),record('unchecked',500,20,{confirmed:false})];
 const result=planPool(records,need());assert.equal(result.complete,false);assert.equal(result.quantityKg,0);assert.equal(result.savings,null);assert.equal(result.excludedCount,5);
});
test('incomplete material quantities do not claim savings',()=>{
 const p=planPool([record('small',120,42)],need());assert.equal(p.complete,false);assert.equal(p.viable,false);assert.equal(p.savings,null);assert.match(p.reason,/380 kg still needed/);
});
test('cheapest records are used first and excess stock is partially allocated',()=>{
 const input=[record('expensive',500,70),record('cheap',600,35)];
 const p=planPool(input,need());assert.equal(p.allocations.length,1);assert.equal(p.allocations[0].recordId,'cheap');assert.equal(p.allocations[0].quantityKg,500);assert.equal(input[1].quantityKg,600);
});
test('fractional kilograms are preserved independently of currency rounding',()=>{
 const p=planPool([record('fraction',0.125,42)],need({quantityKg:.125,comparisonPrice:75,transportCost:0}));
 assert.equal(p.complete,true);assert.equal(p.quantityKg,.125);assert.equal(p.allocations[0].quantityKg,.125);assert.equal(p.materialCost,5.25);assert.equal(p.fee,.26);
});
test('high pickup costs can make a complete plan uneconomical',()=>{
 const p=planPool([record('supply',500,42)],need({transportCost:30000}));assert.equal(p.complete,true);assert.equal(p.viable,false);assert.ok(p.savings<0);
});
test('invalid assumptions fail with a useful reason',()=>{
 for(const change of [{grade:''},{quantityKg:0},{quantityKg:NaN},{comparisonPrice:-2},{transportCost:-1}]){
  const p=planPool([record('supply',500,42)],need(change));assert.equal(p.viable,false);assert.ok(p.reason.length>0);
 }
});

test('selected IDs support explicit empty selection, deduplication and partial lots',()=>{
 const rows=[record('a',300,40),record('b',300,45)];
 assert.equal(planPool(rows,need({selectedRecordIds:[]})).quantityKg,0);
 const p=planPool(rows,need({selectedRecordIds:['a','a','b','missing']}));assert.equal(p.complete,true);assert.equal(p.allocations.length,2);assert.equal(p.allocations[1].quantityKg,200);
 assert.equal(planPool([rows[0],rows[0]],need()).quantityKg,300);
 assert.equal(planPool(rows,need({selectedRecordIds:'a'})).complete,false);
});
test('selected incompatible or unreviewed fields remain excluded with reasons',()=>{
 const rows=[record('a',500,30,{fieldReview:{material:'ai_suggestion'}}),record('b',500,30,{grade:'wrong'})];
 const p=planPool(rows,need({selectedRecordIds:['a','b']}));assert.equal(p.quantityKg,0);assert.match(p.exclusions[0].reasons.join(','),/confirmation/);
});
test('a missing microgram-scale quantity is a shortage rather than assumed complete',()=>{
 const p=planPool([record('a',.000001,42)],need({quantityKg:.000002,transportCost:0}));assert.equal(p.complete,false);assert.equal(p.shortfallKg,.000001);assert.equal(p.savings,null);
 const complete=planPool([record('a',.000001,42),record('b',.000001,42)],need({quantityKg:.000002,transportCost:0}));assert.equal(complete.complete,true);assert.equal(complete.quantityKg,.000002);
});
test('large supported estimates remain finite and unsafe currency precision is rejected',()=>{
 const p=planPool([record('a',1000000,50)],need({quantityKg:1000000}));assert.equal(p.complete,true);assert.equal(p.materialCost,50000000);
 const unsafe=planPool([record('a',1e12,1e12)],need({quantityKg:1e12,comparisonPrice:1e12}));assert.equal(unsafe.complete,false);assert.match(unsafe.reason,/precision/);
});

test('client fee overrides cannot alter the fixed policy and missing transport prevents savings',()=>{
 const p=calculate([record('a',100,40)],need({quantityKg:100,feePercent:0}));assert.equal(p.feePercent,5);assert.equal(p.fee,200);assert.equal(p.transportComplete,false);assert.equal(p.savings,null);
});
