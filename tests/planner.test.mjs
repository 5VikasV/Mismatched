import test from 'node:test';
import assert from 'node:assert/strict';
import { planPool } from '../dist/planner.js';

const record=(id,quantityKg,pricePerKg,changes={})=>({id,title:`Research ${id}`,company:'Test factory',confirmed:true,material:'PP',grade:'PP-H',condition:'Clean',quantityKg,pricePerKg,...changes});
const need=changes=>({material:'PP',grade:'PP-H',quantityKg:500,comparisonPrice:75,transportCost:1200,feePercent:2,...changes});

test('planning uses confirmed records and full delivered cost',()=>{
 const result=planPool([record('a',120,42),record('b',180,44),record('c',200,43)],need());
 assert.equal(result.viable,true);assert.equal(result.quantityKg,500);assert.equal(result.materialCost,21560);
 assert.equal(result.fee,431.2);assert.equal(result.totalCost,23191.2);assert.equal(result.savings,14308.8);
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
 assert.equal(p.complete,true);assert.equal(p.quantityKg,.125);assert.equal(p.allocations[0].quantityKg,.125);assert.equal(p.materialCost,5.25);assert.equal(p.fee,.11);
});
test('high pickup costs can make a complete plan uneconomical',()=>{
 const p=planPool([record('supply',500,42)],need({transportCost:30000}));assert.equal(p.complete,true);assert.equal(p.viable,false);assert.ok(p.savings<0);
});
test('invalid assumptions fail with a useful reason',()=>{
 for(const change of [{grade:''},{quantityKg:0},{quantityKg:NaN},{comparisonPrice:-2},{transportCost:-1},{feePercent:101}]){
  const p=planPool([record('supply',500,42)],need(change));assert.equal(p.viable,false);assert.ok(p.reason.length>0);
 }
});
