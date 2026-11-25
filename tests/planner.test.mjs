import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { planPool, scoreMatch, calculateImpact, DEMO_COMPATIBILITY_RULES, buildLoopGraph, findLoopChains, findChains, isMaterialCompatible } from '../dist/planner.js';
import { CO2_FACTORS, CO2_FACTOR_LIST, getCo2Factor } from '../dist/co2-factors.js';

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
test('3 small lots fail the buyer minimum order separately but pass together with proportional transport shares and net profit',()=>{
 const lots=[
  record('lot-1',150,40,{company:'Alpha Works',latitude:18.52,longitude:73.85}),
  record('lot-2',175,42,{company:'Beta Polymers',latitude:23.02,longitude:72.57}),
  record('lot-3',175,44,{company:'Gamma Plastics',latitude:26.91,longitude:75.78}),
 ];
 const buyerOrder=need({quantityKg:500,comparisonPrice:75,transportCost:1200,feePercent:2});
 for(const singleLot of lots){
  const solo=planPool([singleLot],buyerOrder);
  assert.equal(solo.complete,false);
  assert.equal(solo.viable,false);
  assert.equal(solo.savings,null);
  assert.equal(solo.netProfit,null);
  assert.ok(solo.quantityKg<buyerOrder.quantityKg);
 }
 const pooled=planPool(lots,buyerOrder);
 assert.equal(pooled.complete,true);
 assert.equal(pooled.viable,true);
 assert.equal(pooled.quantityKg,500);
 assert.equal(pooled.transportCost,1200);
 assert.equal(pooled.materialCost,21050);
 assert.equal(pooled.fee,421);
 assert.equal(pooled.totalCost,22671);
 assert.equal(pooled.baselineCost,37500);
 assert.equal(pooled.netProfit,14829);
 assert.equal(pooled.savings,14829);
 assert.equal(pooled.allocations.length,3);
 assert.equal(pooled.allocations[0].quantityShare,0.3);
 assert.equal(pooled.allocations[0].transportShare,360);
 assert.equal(pooled.allocations[1].quantityShare,0.35);
 assert.equal(pooled.allocations[1].transportShare,420);
 assert.equal(pooled.allocations[2].quantityShare,0.35);
 assert.equal(pooled.allocations[2].transportShare,420);
});
test('3 fractional small lots preserve six-decimal quantity precision and two-decimal currency',()=>{
 const lots=[
  record('f1',0.123456,41.25,{company:'Precision A'}),
  record('f2',0.234567,42.50,{company:'Precision B'}),
  record('f3',0.345678,43.75,{company:'Precision C'}),
 ];
 const requirement=need({quantityKg:0.703701,comparisonPrice:80,transportCost:12,feePercent:0});
 for(const lot of lots){
  const solo=planPool([lot],requirement);
  assert.equal(solo.complete,false);
  assert.equal(solo.viable,false);
 }
 const pooled=planPool(lots,requirement);
 assert.equal(pooled.complete,true);
 assert.equal(pooled.viable,true);
 assert.equal(pooled.quantityKg,0.703701);
 assert.equal(pooled.allocations[0].quantityKg,0.123456);
 assert.equal(pooled.allocations[1].quantityKg,0.234567);
 assert.equal(pooled.allocations[2].quantityKg,0.345678);
 assert.equal(pooled.allocations[0].quantityShare,0.175438);
 assert.equal(pooled.allocations[1].quantityShare,0.333333);
 assert.equal(pooled.allocations[2].quantityShare,0.491229);
 assert.equal(pooled.allocations[0].transportShare,2.11);
 assert.equal(pooled.allocations[1].transportShare,4);
 assert.equal(pooled.allocations[2].transportShare,5.89);
 assert.equal(pooled.materialCost,30.18);
 assert.equal(pooled.totalCost,42.18);
 assert.equal(pooled.baselineCost,56.3);
 assert.equal(pooled.netProfit,14.12);
});
test('gap card reports missing kg and ranks nearby compatible factories when pool misses buyer minimum order',()=>{
 const lots=[
  record('selected-1',200,40,{company:'Pune Polymers',location:'Pune',latitude:18.52,longitude:73.85}),
  record('near-lot',220,43,{company:'Thane Recyclers',location:'Thane',latitude:19.21,longitude:72.97}),
  record('far-lot',300,39,{company:'Jaipur Plastics',location:'Jaipur',latitude:26.91,longitude:75.78}),
  record('wrong-grade',400,35,{company:'Wrong Grade Co',grade:'PP-C',latitude:18.55,longitude:73.88}),
 ];
 const p=planPool(lots,need({quantityKg:500,selectedIds:['selected-1']}));
 assert.equal(p.complete,false);
 assert.equal(p.viable,false);
 assert.equal(p.quantityKg,200);
 assert.equal(p.missingKg,300);
 assert.ok(p.gapCard);
 assert.equal(p.gapCard.status,'missing_minimum');
 assert.equal(p.gapCard.missingKg,300);
 assert.equal(p.gapCard.canCloseGap,true);
 assert.equal(p.gapCard.candidates.length,2);
 assert.equal(p.gapCard.candidates[0].recordId,'near-lot');
 assert.equal(p.gapCard.candidates[0].company,'Thane Recyclers');
 assert.equal(p.gapCard.candidates[0].availableKg,220);
 assert.equal(p.gapCard.candidates[0].suggestedKg,220);
 assert.equal(p.gapCard.candidates[0].isExcluded,true);
 assert.ok(p.gapCard.candidates[0].distanceKm<p.gapCard.candidates[1].distanceKm);
 assert.equal(p.gapCard.candidates[1].recordId,'far-lot');
 assert.equal(p.gapCard.candidates[1].suggestedKg,80);
});
test('gap card is shown when pool meets minimum order but has negative profit, listing nearby lower-cost compatible factories',()=>{
 const lots=[
  record('high-cost',500,68,{company:'High Cost Works',location:'Pune',latitude:18.52,longitude:73.85}),
  record('nearby-cheap',300,38,{company:'Chakan Recovery',location:'Chakan',latitude:18.76,longitude:73.86}),
  record('far-cheap',300,36,{company:'Delhi Polymers',location:'Delhi',latitude:28.61,longitude:77.20}),
 ];
 const p=planPool(lots,need({quantityKg:500,comparisonPrice:70,transportCost:5000,feePercent:2,selectedIds:['high-cost']}));
 assert.equal(p.complete,true);
 assert.equal(p.viable,false);
 assert.ok(p.netProfit<0);
 assert.equal(p.missingKg,0);
 assert.ok(p.gapCard);
 assert.equal(p.gapCard.status,'negative_profit');
 assert.equal(p.gapCard.missingKg,0);
 assert.equal(p.gapCard.netProfit,p.netProfit);
 assert.equal(p.gapCard.profitShortfall,Math.abs(p.netProfit));
 assert.equal(p.gapCard.candidates.length,2);
 assert.equal(p.gapCard.candidates[0].recordId,'nearby-cheap');
 assert.equal(p.gapCard.candidates[0].cheaperThanAllocated,true);
 assert.equal(p.gapCard.candidates[1].recordId,'far-cheap');
});
test('viable pool with positive profit does not produce a gap card',()=>{
 const p=planPool([record('good',500,40,{latitude:18.52,longitude:73.85})],need({quantityKg:500,comparisonPrice:75,transportCost:1000,feePercent:0}));
 assert.equal(p.complete,true);
 assert.equal(p.viable,true);
 assert.equal(p.missingKg,0);
 assert.equal(p.gapCard,null);
});
test('scoreMatch calculates factor breakdown for material fit, distance, minimum order fit, grade fit, and price fit and sums total score',()=>{
 const lot=record('lot-near',500,35,{distanceKm:12});
 const buyer=need({material:'PP',grade:'PP-H',quantityKg:500,comparisonPrice:75,maxDistanceKm:50});
 const breakdown=scoreMatch(lot,buyer);
 assert.equal(breakdown.factors.length,5);
 assert.deepEqual(breakdown.factors.map(f=>f.key),['materialFit','distance','minimumOrderFit','gradeFit','priceFit']);
 assert.equal(breakdown.byKey.materialFit.score,20);
 assert.equal(breakdown.byKey.materialFit.sentence,'Matches required PP material.');
 assert.equal(breakdown.byKey.distance.score,18);
 assert.equal(breakdown.byKey.distance.sentence,'12 km away, within your 50 km limit.');
 assert.equal(breakdown.byKey.minimumOrderFit.score,20);
 assert.match(breakdown.byKey.minimumOrderFit.sentence,/500 kg available, meeting the 500 kg minimum order/);
 assert.equal(breakdown.byKey.gradeFit.score,20);
 assert.equal(breakdown.byKey.gradeFit.sentence,'Exact PP-H grade match.');
 assert.equal(breakdown.byKey.priceFit.score,20);
 assert.match(breakdown.byKey.priceFit.sentence,/below your ₹75\/kg comparison price/);
 const expectedSum=breakdown.factors.reduce((sum,f)=>sum+f.score,0);
 assert.equal(breakdown.totalScore,expectedSum);
 assert.equal(breakdown.totalScore,98);
 assert.equal(breakdown.maxScore,100);
 assert.equal(breakdown.unknownCount,0);
});
test('scoreMatch marks unknown values as "Unknown" and does not count them as a good or bad factor',()=>{
 const lotWithUnknowns={id:'u1',title:'Partial lot',company:'Mystery Co',material:'PP',grade:null,condition:'Clean',quantityKg:250,pricePerKg:null,latitude:null,longitude:null};
 const buyer=need({material:'PP',grade:'PP-H',quantityKg:500,comparisonPrice:75,maxDistanceKm:50});
 const breakdown=scoreMatch(lotWithUnknowns,buyer);
 assert.equal(breakdown.byKey.materialFit.known,true);
 assert.equal(breakdown.byKey.materialFit.score,20);
 assert.equal(breakdown.byKey.minimumOrderFit.known,true);
 assert.equal(breakdown.byKey.minimumOrderFit.score,10);
 assert.match(breakdown.byKey.minimumOrderFit.sentence,/250 kg covers 50% of the 500 kg minimum order/);

 for(const unknownKey of ['distance','gradeFit','priceFit']){
  const factor=breakdown.byKey[unknownKey];
  assert.equal(factor.known,false);
  assert.equal(factor.score,null);
  assert.equal(factor.displayScore,'Unknown');
  assert.equal(factor.status,'unknown');
  assert.match(factor.sentence,/Unknown/);
 }
 // Total score is strictly the sum of known factors (20 + 10 = 30) out of known maxScore (40)
 assert.equal(breakdown.totalScore,30);
 assert.equal(breakdown.maxScore,40);
 assert.equal(breakdown.knownCount,2);
 assert.equal(breakdown.unknownCount,3);
});
test('planPool attaches scoreBreakdown to every allocation, gap candidate, and match evaluation',()=>{
 const lots=[
  record('a',200,40,{company:'Alpha',latitude:19.18,longitude:72.97}),
  record('b',250,42,{company:'Beta',latitude:null,longitude:null}),
 ];
 const p=planPool(lots,need({quantityKg:500,comparisonPrice:75,selectedIds:['a']}));
 assert.equal(p.allocations.length,1);
 assert.ok(p.allocations[0].scoreBreakdown);
 assert.equal(p.allocations[0].scoreBreakdown.factors.length,5);
 assert.equal(p.allocations[0].scoreBreakdown.byKey.distance.known,true);
 assert.match(p.allocations[0].scoreBreakdown.byKey.distance.sentence,/within your 50 km limit/);
 assert.ok(p.gapCard);
 assert.equal(p.gapCard.candidates.length,1);
 assert.ok(p.gapCard.candidates[0].scoreBreakdown);
 assert.equal(p.gapCard.candidates[0].scoreBreakdown.byKey.distance.displayScore,'Unknown');
 assert.equal(p.gapCard.candidates[0].scoreBreakdown.byKey.distance.score,null);
});
test('CO2 factors config includes source names, estimate notes, and TODO placeholders where factors are missing',()=>{
 assert.ok(CO2_FACTOR_LIST.length>=8);
 for(const item of CO2_FACTOR_LIST){
  assert.ok(typeof item.source==='string'&&item.source.length>0,`Source required for ${item.material}`);
  assert.ok(typeof item.note==='string'&&/estimate/i.test(item.note),`Estimate note required for ${item.material}`);
  assert.equal(item.isEstimate,true);
  if(item.kgCo2PerKg===null){
   assert.ok(typeof item.todo==='string'&&item.todo.startsWith('TODO:'),`TODO placeholder required for missing factor ${item.material}`);
  }else{
   assert.ok(typeof item.kgCo2PerKg==='number'&&item.kgCo2PerKg>0);
  }
 }
 const pp=getCo2Factor('PP');
 assert.equal(pp.hasFactor,true);
 assert.equal(pp.kgCo2PerKg,CO2_FACTORS.PP.kgCo2PerKg);
 assert.match(pp.note,/Estimate/i);

 const ewaste=getCo2Factor('E-waste');
 assert.equal(ewaste.hasFactor,false);
 assert.equal(ewaste.kgCo2PerKg,null);
 assert.match(ewaste.todo,/TODO:/);

 const unconfigured=getCo2Factor('Titanium Alloy');
 assert.equal(unconfigured.hasFactor,false);
 assert.equal(unconfigured.kgCo2PerKg,null);
 assert.match(unconfigured.todo,/TODO:/);
});
test('calculateImpact sums seller earnings, buyer savings, diverted scrap kg, and CO2 avoided strictly from saved pool plans and confirmed records',()=>{
 const lots=[
  record('pp-1',200,40,{company:'Pune Polymers',material:'PP',grade:'PP-H'}),
  record('pp-2',300,44,{company:'Thane Recovery',material:'PP',grade:'PP-H'}),
  record('ew-1',250,50,{company:'Nashik E-Waste',material:'E-waste',grade:'EW-1'}),
  record('unconfirmed',400,30,{company:'Unconfirmed Co',material:'PP',grade:'PP-H',confirmed:false}),
 ];
 const ppPlan=planPool(lots,need({material:'PP',grade:'PP-H',quantityKg:500,comparisonPrice:75,transportCost:1200,feePercent:2}));
 assert.equal(ppPlan.complete,true);
 const impact=calculateImpact([ppPlan],lots);
 assert.equal(impact.planCount,1);
 assert.equal(impact.sellerEarningsInr,21200);
 assert.equal(impact.buyerSavingsInr,14676);
 assert.equal(impact.scrapDivertedKg,500);
 assert.equal(impact.estimatedCo2AvoidedKg,Math.round(500*CO2_FACTORS.PP.kgCo2PerKg*100)/100);
 assert.equal(impact.co2Status,'complete');

 // Plan for material with missing factor (E-waste) does not invent CO2 numbers and returns "Not enough data"
 const ewastePlan=planPool(lots,need({material:'E-waste',grade:'EW-1',quantityKg:250,comparisonPrice:90,transportCost:500,feePercent:0}));
 assert.equal(ewastePlan.complete,true);
 const ewasteOnlyImpact=calculateImpact([ewastePlan],lots);
 assert.equal(ewasteOnlyImpact.planCount,1);
 assert.equal(ewasteOnlyImpact.sellerEarningsInr,12500);
 assert.equal(ewasteOnlyImpact.buyerSavingsInr,9500);
 assert.equal(ewasteOnlyImpact.scrapDivertedKg,250);
 assert.equal(ewasteOnlyImpact.estimatedCo2AvoidedKg,null);
 assert.equal(ewasteOnlyImpact.co2Status,'not_enough_data');
 assert.equal(ewasteOnlyImpact.displayCo2,'Not enough data');
 assert.deepEqual(ewasteOnlyImpact.missingCo2Materials,['E-waste']);
 assert.equal(ewasteOnlyImpact.byMaterial[0].displayCo2,'Not enough data');

 // Incomplete plan or plan referencing deleted record is excluded
 const incompletePlan=planPool(lots,need({material:'PP',grade:'PP-H',quantityKg:1000,comparisonPrice:75}));
 assert.equal(incompletePlan.complete,false);
 const withIncomplete=calculateImpact([ppPlan,incompletePlan],lots);
 assert.equal(withIncomplete.planCount,1);
 assert.equal(withIncomplete.excludedPlanCount,1);

 const afterRecordDeleted=calculateImpact([ppPlan],lots.filter(r=>r.id!=='pp-1'));
 assert.equal(afterRecordDeleted.planCount,0);
 assert.equal(afterRecordDeleted.sellerEarningsInr,0);
});

test('compatibility rules JSON file defines materialProduced and materialsAccepted and is labeled "demo rules"',async ()=>{
 const jsonText=await readFile(new URL('../data/compatibility-rules.json',import.meta.url),'utf8');
 const parsed=JSON.parse(jsonText);
 assert.equal(parsed.label,'demo rules');
 assert.ok(Array.isArray(parsed.rules)&&parsed.rules.length>=5);
 for(const rule of parsed.rules){
  assert.ok(typeof rule.materialProduced==='string'&&rule.materialProduced.length>0);
  assert.ok(Array.isArray(rule.materialsAccepted)&&rule.materialsAccepted.length>0);
 }
 assert.equal(DEMO_COMPATIBILITY_RULES.label,'demo rules');
 assert.equal(parsed.rules.length,DEMO_COMPATIBILITY_RULES.rules.length);
});

test('findLoopChains finds chains of length 2 to 4 where waste of A is raw material for B and highlights the best loop by total value',()=>{
 const graph=buildLoopGraph();
 assert.equal(graph.rulesLabel,'demo rules');
 assert.equal(graph.nodes.length,7);
 assert.equal(graph.edges.length,8);

 // Demo graph has closed loops of lengths 2, 3, and 4
 assert.equal(graph.loops.length,3);
 for(const loop of graph.loops){
  assert.ok(loop.length>=2&&loop.length<=4,`Chain length ${loop.length} must be between 2 and 4`);
  assert.equal(loop.isLoop,true);
  assert.equal(loop.path[0],loop.path[loop.path.length-1]);
 }
 const lengths=graph.loops.map(l=>l.length).sort();
 assert.deepEqual(lengths,[2,3,4]);

 // Best loop is the 4-factory polymer loop with total value 142,000
 assert.ok(graph.bestLoop);
 assert.equal(graph.bestLoop.length,4);
 assert.equal(graph.bestLoop.totalValue,142000);
 assert.equal(graph.bestLoop.isBest,true);
 assert.deepEqual(graph.bestLoop.nodes,['fac-pune-moulders','fac-chakan-granulators','fac-thane-extruders','fac-nashik-compounding']);

 // Second loop is the 3-factory metal loop (96,000) and third is the 2-factory polymer loop (71,000)
 assert.equal(graph.loops[1].length,3);
 assert.equal(graph.loops[1].totalValue,96000);
 assert.equal(graph.loops[1].isBest,false);
 assert.equal(graph.loops[2].length,2);
 assert.equal(graph.loops[2].totalValue,71000);
 assert.equal(graph.loops[2].isBest,false);

 // Nodes and edges in the best loop are flagged for highlighting
 const bestNodes=graph.nodes.filter(n=>n.isBestLoopNode).map(n=>n.id);
 assert.deepEqual(bestNodes,['fac-pune-moulders','fac-chakan-granulators','fac-thane-extruders','fac-nashik-compounding']);
 const bestEdges=graph.edges.filter(e=>e.isBestLoopEdge).map(e=>e.id);
 assert.equal(bestEdges.length,4);
});

test('chain finder enforces length 2 to 4 bounds, deduplicates cycle rotations, and bridges compatibility via rules',()=>{
 const customRules=[
  {materialProduced:'Aluminium Dross',materialsAccepted:['Smelter Feed','Aluminium Dross']},
  {materialProduced:'Secondary Ingot',materialsAccepted:['Extrusion Billet','Secondary Ingot']},
  {materialProduced:'Extrusion Butt',materialsAccepted:['Dross Processor Input']},
  {materialProduced:'Step 1 Waste',materialsAccepted:['Step 2 Input']},
  {materialProduced:'Step 2 Waste',materialsAccepted:['Step 3 Input']},
  {materialProduced:'Step 3 Waste',materialsAccepted:['Step 4 Input']},
  {materialProduced:'Step 4 Waste',materialsAccepted:['Step 5 Input']},
  {materialProduced:'Step 5 Waste',materialsAccepted:['Step 1 Input']},
 ];
 const customFactories=[
  // 3-node loop via rule-bridged compatibility (total value = 10000 + 25000 + 15000 = 50000)
  {id:'A',name:'Factory A',materialProduced:'Aluminium Dross',materialsAccepted:['Dross Processor Input'],valueInr:10000},
  {id:'B',name:'Factory B',materialProduced:'Secondary Ingot',materialsAccepted:['Smelter Feed'],valueInr:25000},
  {id:'C',name:'Factory C',materialProduced:'Extrusion Butt',materialsAccepted:['Extrusion Billet'],valueInr:15000},
  // 2-node loop with higher value (total value = 40000 + 45000 = 85000)
  {id:'X',name:'Factory X',materialProduced:'Copper Chop',materialsAccepted:['Refined Cathode Offcut'],valueInr:40000},
  {id:'Y',name:'Factory Y',materialProduced:'Refined Cathode Offcut',materialsAccepted:['Copper Chop'],valueInr:45000},
  // 5-node loop (length 5 -> must be excluded from length 2..4 loops)
  {id:'N1',name:'Node 1',materialProduced:'Step 1 Waste',materialsAccepted:['Step 1 Input'],valueInr:90000},
  {id:'N2',name:'Node 2',materialProduced:'Step 2 Waste',materialsAccepted:['Step 2 Input'],valueInr:90000},
  {id:'N3',name:'Node 3',materialProduced:'Step 3 Waste',materialsAccepted:['Step 3 Input'],valueInr:90000},
  {id:'N4',name:'Node 4',materialProduced:'Step 4 Waste',materialsAccepted:['Step 4 Input'],valueInr:90000},
  {id:'N5',name:'Node 5',materialProduced:'Step 5 Waste',materialsAccepted:['Step 5 Input'],valueInr:90000},
 ];
 assert.equal(isMaterialCompatible('Aluminium Dross',['Smelter Feed'],customRules).compatible,true);
 const chains=findChains(customFactories,customRules);
 assert.equal(chains.loops.length,2,'Only the 2-node and 3-node loops are within length 2 to 4 (5-node loop excluded)');
 assert.equal(chains.bestLoop.length,2);
 assert.equal(chains.bestLoop.totalValue,85000);
 assert.deepEqual(chains.bestLoop.nodes,['X','Y']);
 assert.equal(chains.loops[1].length,3);
 assert.equal(chains.loops[1].totalValue,50000);
 assert.deepEqual(chains.loops[1].nodes,['A','B','C']);
});
