import { CO2_FACTORS, CO2_FACTOR_LIST, getCo2Factor } from './co2-factors.js';
import {
  DEMO_COMPATIBILITY_RULES,
  DEMO_RULES,
  DEMO_FACTORIES,
  normalizeCompatibilityRules,
  isMaterialCompatible,
  normalizeFactoryNodes,
  buildLoopEdges,
  buildLoopGraph,
  findLoopChains,
  findChains,
} from './loop-graph.js';

export {
  CO2_FACTORS,
  CO2_FACTOR_LIST,
  getCo2Factor,
  DEMO_COMPATIBILITY_RULES,
  DEMO_RULES,
  DEMO_FACTORIES,
  normalizeCompatibilityRules,
  isMaterialCompatible,
  normalizeFactoryNodes,
  buildLoopEdges,
  buildLoopGraph,
  findLoopChains,
  findChains,
};
export const DEFAULT_DISTANCE_LIMIT_KM = 50;

export function haversineKm(lat1,lon1,lat2,lon2) {
 const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=-90&&v<=90;
 const finiteLon=v=>typeof v==='number'&&Number.isFinite(v)&&v>=-180&&v<=180;
 if(!finite(lat1)||!finiteLon(lon1)||!finite(lat2)||!finiteLon(lon2))return null;
 const R=6371,toRad=d=>d*Math.PI/180,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);
 const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
 return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))*100)/100;
}

export function scoreMatch(lot={},buyer={}) {
 const MAX_SCORE=20;
 const norm=v=>String(v??'').trim().toUpperCase();
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 const pos=v=>finite(v)&&v>0;
 const round2=n=>Math.round((n+Number.EPSILON)*100)/100;
 const fmtNum=n=>String(Math.round(n*100)/100);

 const lotMatRaw=String(lot?.material??'').trim();
 const buyerMatRaw=String(buyer?.material??'').trim();
 const lotMat=norm(lotMatRaw);
 const buyerMat=norm(buyerMatRaw);
 let materialFactor;
 if(!lotMat||!buyerMat){
  materialFactor={key:'materialFit',label:'Material fit',score:null,maxScore:MAX_SCORE,known:false,status:'unknown',displayScore:'Unknown',sentence:'Unknown material fit because material is not recorded.'};
 }else if(lotMat===buyerMat){
  materialFactor={key:'materialFit',label:'Material fit',score:20,maxScore:MAX_SCORE,known:true,status:'good',displayScore:'20 / 20',sentence:`Matches required ${buyerMatRaw} material.`};
 }else if(lotMat.includes(buyerMat)||buyerMat.includes(lotMat)){
  materialFactor={key:'materialFit',label:'Material fit',score:10,maxScore:MAX_SCORE,known:true,status:'partial',displayScore:'10 / 20',sentence:`Partially matches ${buyerMatRaw} (${lotMatRaw} recorded).`};
 }else{
  materialFactor={key:'materialFit',label:'Material fit',score:0,maxScore:MAX_SCORE,known:true,status:'bad',displayScore:'0 / 20',sentence:`${lotMatRaw} does not match required ${buyerMatRaw} material.`};
 }

 const bLat=buyer?.buyerLatitude!==undefined?buyer.buyerLatitude:buyer?.latitude;
 const bLon=buyer?.buyerLongitude!==undefined?buyer.buyerLongitude:buyer?.longitude;
 const distKm=finite(lot?.distanceKm)&&lot.distanceKm>=0?round2(lot.distanceKm):haversineKm(lot?.latitude,lot?.longitude,bLat,bLon);
 const rawLimit=buyer?.maxDistanceKm??buyer?.distanceLimitKm;
 const limitKm=pos(rawLimit)?round2(rawLimit):DEFAULT_DISTANCE_LIMIT_KM;
 let distanceFactor;
 if(distKm===null){
  distanceFactor={key:'distance',label:'Distance',score:null,maxScore:MAX_SCORE,known:false,status:'unknown',displayScore:'Unknown',distanceKm:null,limitKm,sentence:'Unknown distance because coordinates are not recorded.'};
 }else if(distKm<=limitKm){
  const ratio=limitKm>0?distKm/limitKm:0;
  const s=Math.max(10,Math.min(20,Math.round(20-ratio*10)));
  distanceFactor={key:'distance',label:'Distance',score:s,maxScore:MAX_SCORE,known:true,status:'good',displayScore:`${s} / 20`,distanceKm:distKm,limitKm,sentence:`${fmtNum(distKm)} km away, within your ${fmtNum(limitKm)} km limit.`};
 }else{
  const overRatio=limitKm>0?(distKm-limitKm)/limitKm:1;
  const s=Math.max(0,Math.min(9,Math.round(10*(1-Math.min(1,overRatio)))));
  distanceFactor={key:'distance',label:'Distance',score:s,maxScore:MAX_SCORE,known:true,status:s>=5?'partial':'bad',displayScore:`${s} / 20`,distanceKm:distKm,limitKm,sentence:`${fmtNum(distKm)} km away, outside your ${fmtNum(limitKm)} km limit.`};
 }

 const lotQty=pos(lot?.totalQuantityKg)?lot.totalQuantityKg:pos(lot?.quantityKg)?lot.quantityKg:pos(lot?.availableKg)?lot.availableKg:null;
 const minOrderKg=pos(buyer?.quantityKg)?buyer.quantityKg:pos(buyer?.requiredKg)?buyer.requiredKg:pos(buyer?.minOrderKg)?buyer.minOrderKg:null;
 let minOrderFactor;
 if(lotQty===null||minOrderKg===null){
  minOrderFactor={key:'minimumOrderFit',label:'Minimum order fit',score:null,maxScore:MAX_SCORE,known:false,status:'unknown',displayScore:'Unknown',sentence:'Unknown minimum order fit because quantity or minimum order is not recorded.'};
 }else if(lotQty>=minOrderKg){
  minOrderFactor={key:'minimumOrderFit',label:'Minimum order fit',score:20,maxScore:MAX_SCORE,known:true,status:'good',displayScore:'20 / 20',sentence:`${fmtNum(lotQty)} kg available, meeting the ${fmtNum(minOrderKg)} kg minimum order.`};
 }else{
  const ratio=lotQty/minOrderKg;
  const pct=Math.round(ratio*100);
  const s=Math.max(0,Math.min(19,Math.round(ratio*20)));
  minOrderFactor={key:'minimumOrderFit',label:'Minimum order fit',score:s,maxScore:MAX_SCORE,known:true,status:s>=10?'partial':'bad',displayScore:`${s} / 20`,sentence:`${fmtNum(lotQty)} kg covers ${pct}% of the ${fmtNum(minOrderKg)} kg minimum order.`};
 }

 const lotGradeRaw=String(lot?.grade??'').trim();
 const buyerGradeRaw=String(buyer?.grade??'').trim();
 const lotGrade=norm(lotGradeRaw);
 const buyerGrade=norm(buyerGradeRaw);
 let gradeFactor;
 if(!lotGrade||!buyerGrade){
  gradeFactor={key:'gradeFit',label:'Grade fit',score:null,maxScore:MAX_SCORE,known:false,status:'unknown',displayScore:'Unknown',sentence:'Unknown grade fit because grade is not recorded.'};
 }else if(lotGrade===buyerGrade){
  gradeFactor={key:'gradeFit',label:'Grade fit',score:20,maxScore:MAX_SCORE,known:true,status:'good',displayScore:'20 / 20',sentence:`Exact ${buyerGradeRaw} grade match.`};
 }else if(lotGrade.includes(buyerGrade)||buyerGrade.includes(lotGrade)){
  gradeFactor={key:'gradeFit',label:'Grade fit',score:10,maxScore:MAX_SCORE,known:true,status:'partial',displayScore:'10 / 20',sentence:`Related grade ${lotGradeRaw} against required ${buyerGradeRaw}.`};
 }else{
  gradeFactor={key:'gradeFit',label:'Grade fit',score:0,maxScore:MAX_SCORE,known:true,status:'bad',displayScore:'0 / 20',sentence:`Grade ${lotGradeRaw} does not match required ${buyerGradeRaw}.`};
 }

 const lotPrice=pos(lot?.pricePerKg)?round2(lot.pricePerKg):null;
 const targetPrice=pos(buyer?.comparisonPrice)?round2(buyer.comparisonPrice):pos(buyer?.targetPrice)?round2(buyer.targetPrice):pos(buyer?.pricePerKg)?round2(buyer.pricePerKg):null;
 let priceFactor;
 if(lotPrice===null||targetPrice===null){
  priceFactor={key:'priceFit',label:'Price fit',score:null,maxScore:MAX_SCORE,known:false,status:'unknown',displayScore:'Unknown',sentence:'Unknown price fit because asking or comparison price is not recorded.'};
 }else if(lotPrice<=targetPrice){
  const savingsRatio=(targetPrice-lotPrice)/targetPrice;
  const s=Math.max(12,Math.min(20,Math.round(12+Math.min(1,savingsRatio*2)*8)));
  const diff=round2(targetPrice-lotPrice);
  priceFactor={key:'priceFit',label:'Price fit',score:s,maxScore:MAX_SCORE,known:true,status:'good',displayScore:`${s} / 20`,sentence:diff>0?`₹${fmtNum(lotPrice)}/kg is ₹${fmtNum(diff)}/kg below your ₹${fmtNum(targetPrice)}/kg comparison price.`:`₹${fmtNum(lotPrice)}/kg matches your ₹${fmtNum(targetPrice)}/kg comparison price.`};
 }else{
  const overRatio=(lotPrice-targetPrice)/targetPrice;
  const s=Math.max(0,Math.min(10,Math.round(10*(1-Math.min(1,overRatio*2)))));
  const diff=round2(lotPrice-targetPrice);
  priceFactor={key:'priceFit',label:'Price fit',score:s,maxScore:MAX_SCORE,known:true,status:s>=6?'partial':'bad',displayScore:`${s} / 20`,sentence:`₹${fmtNum(lotPrice)}/kg is ₹${fmtNum(diff)}/kg above your ₹${fmtNum(targetPrice)}/kg comparison price.`};
 }

 const factors=[materialFactor,distanceFactor,minOrderFactor,gradeFactor,priceFactor];
 const factorMap={materialFit:materialFactor,distance:distanceFactor,minimumOrderFit:minOrderFactor,gradeFit:gradeFactor,priceFit:priceFactor};
 const knownFactors=factors.filter(f=>f.known&&typeof f.score==='number');
 const totalScore=knownFactors.reduce((sum,f)=>sum+f.score,0);
 const maxScore=knownFactors.reduce((sum,f)=>sum+f.maxScore,0);
 return {
  totalScore,
  maxScore,
  knownCount:knownFactors.length,
  unknownCount:factors.length-knownFactors.length,
  factors,
  byKey:factorMap,
 };
}

export function planPool(records,requirements={}) {
 const {material,grade,quantityKg,comparisonPrice,transportCost=0,feePercent=0,selectedIds,buyerLatitude=19.0760,buyerLongitude=72.8777,maxDistanceKm,distanceLimitKm}=requirements;
 const round=n=>Math.round((n+Number.EPSILON)*100)/100,qty=n=>Math.round(n*1000000)/1000000,norm=v=>String(v??'').trim().toUpperCase(),finite=v=>typeof v==='number'&&Number.isFinite(v);
 const list=Array.isArray(records)?records:[];
 const buyerReq={material,grade,quantityKg,comparisonPrice,buyerLatitude,buyerLongitude,maxDistanceKm:maxDistanceKm??distanceLimitKm};
 const matches=list.map(r=>({
  recordId:r.id,
  title:r.title,
  company:r.company||'Company not recorded',
  material:r.material||null,
  grade:r.grade||null,
  condition:r.condition||null,
  confirmed:Boolean(r.confirmed),
  location:r.location||null,
  latitude:finite(r.latitude)?r.latitude:null,
  longitude:finite(r.longitude)?r.longitude:null,
  quantityKg:finite(r.quantityKg)?qty(r.quantityKg):null,
  pricePerKg:finite(r.pricePerKg)?round(r.pricePerKg):null,
  scoreBreakdown:scoreMatch(r,buyerReq),
 }));
 const scoreById=new Map(matches.map(m=>[m.recordId,m.scoreBreakdown]));
 const p={viable:false,complete:false,reason:'',allocations:[],matches,quantityKg:0,requiredKg:finite(quantityKg)?qty(quantityKg):0,missingKg:0,materialCost:0,transportCost:finite(transportCost)?round(transportCost):transportCost,feePercent,fee:0,totalCost:0,baselineCost:0,savings:null,netProfit:null,excludedCount:0,gapCard:null};
 if(!norm(material)||!norm(grade))return {...p,reason:'Enter a material and confirmed grade to find compatible research records.'};
 if(![quantityKg,comparisonPrice].every(v=>finite(v)&&v>0)||!finite(transportCost)||transportCost<0||!finite(feePercent)||feePercent<0||feePercent>100)return {...p,reason:'Enter positive required quantity and comparison price, a non-negative pickup estimate, and a fee from 0 to 100%.'};
 const selectedSet=Array.isArray(selectedIds)?new Set(selectedIds):null;
 const isCompatible=r=>r.confirmed===true&&norm(r.material)===norm(material)&&norm(r.grade)===norm(grade)&&norm(r.condition)==='CLEAN'&&finite(r.quantityKg)&&r.quantityKg>0&&finite(r.pricePerKg)&&r.pricePerKg>0;
 const allCompatible=list.filter(isCompatible);
 const eligible=allCompatible.filter(r=>!selectedSet||selectedSet.has(r.id)).sort((a,b)=>a.pricePerKg-b.pricePerKg||b.quantityKg-a.quantityKg);
 p.excludedCount=list.length-eligible.length;let needed=qty(quantityKg);
 const allocatedById=new Map();
 for(const r of eligible){if(needed<=.000001)break;const q=qty(Math.min(needed,r.quantityKg));allocatedById.set(r.id,q);p.allocations.push({recordId:r.id,title:r.title,company:r.company||'Company not recorded',material:r.material||null,grade:r.grade||null,condition:r.condition||null,location:r.location||null,latitude:finite(r.latitude)?r.latitude:null,longitude:finite(r.longitude)?r.longitude:null,quantityKg:q,totalQuantityKg:qty(r.quantityKg),pricePerKg:round(r.pricePerKg),payout:round(q*r.pricePerKg),quantityShare:0,transportShare:0,scoreBreakdown:scoreById.get(r.id)||scoreMatch(r,buyerReq)});needed=qty(Math.max(0,needed-q));}
 p.quantityKg=qty(p.allocations.reduce((s,a)=>s+a.quantityKg,0));
 p.missingKg=qty(Math.max(0,p.requiredKg-p.quantityKg));
 for(const a of p.allocations){const share=p.quantityKg>0?a.quantityKg/p.quantityKg:0;a.quantityShare=qty(share);a.transportShare=round(p.transportCost*share);}
 p.materialCost=round(p.allocations.reduce((s,a)=>s+a.payout,0));p.fee=round(p.materialCost*feePercent/100);p.totalCost=round(p.materialCost+p.transportCost+p.fee);p.baselineCost=round(p.requiredKg*comparisonPrice);p.complete=needed<=.000001;

 const buildGapCard=(status)=>{
  const coordAllocations=p.allocations.filter(a=>finite(a.latitude)&&finite(a.longitude));
  const refLat=coordAllocations.length?coordAllocations.reduce((s,a)=>s+a.latitude,0)/coordAllocations.length:(finite(buyerLatitude)?buyerLatitude:19.0760);
  const refLon=coordAllocations.length?coordAllocations.reduce((s,a)=>s+a.longitude,0)/coordAllocations.length:(finite(buyerLongitude)?buyerLongitude:72.8777);
  const maxAllocatedPrice=p.allocations.length?Math.max(...p.allocations.map(a=>a.pricePerKg)):null;
  const candidatePool=allCompatible.map(r=>{
   const used=allocatedById.get(r.id)||0;
   const remainingKg=qty(Math.max(0,r.quantityKg-used));
   const isExcluded=Boolean(selectedSet&&!selectedSet.has(r.id));
   const distanceKm=haversineKm(refLat,refLon,r.latitude,r.longitude);
   const buyerDistanceKm=haversineKm(buyerLatitude,buyerLongitude,r.latitude,r.longitude);
   const effectivePrice=round(r.pricePerKg*(1+feePercent/100));
   const cheaperThanAllocated=maxAllocatedPrice!==null&&r.pricePerKg<maxAllocatedPrice;
   return {
    recordId:r.id,
    title:r.title,
    company:r.company||'Company not recorded',
    location:r.location||null,
    latitude:finite(r.latitude)?r.latitude:null,
    longitude:finite(r.longitude)?r.longitude:null,
    availableKg:remainingKg,
    totalQuantityKg:qty(r.quantityKg),
    pricePerKg:round(r.pricePerKg),
    effectivePricePerKg:effectivePrice,
    distanceKm,
    buyerDistanceKm,
    isExcluded,
    cheaperThanAllocated,
    closesMinimumGap:p.missingKg>0?remainingKg>=p.missingKg:remainingKg>0,
    scoreBreakdown:scoreById.get(r.id)||scoreMatch(r,buyerReq),
   };
  }).filter(c=>c.availableKg>0&&(status==='missing_minimum'||c.cheaperThanAllocated||c.effectivePricePerKg<comparisonPrice||c.isExcluded));
  candidatePool.sort((a,b)=>{
   const da=a.distanceKm??Infinity,db=b.distanceKm??Infinity;
   if(da!==db)return da-db;
   if(a.pricePerKg!==b.pricePerKg)return a.pricePerKg-b.pricePerKg;
   return b.availableKg-a.availableKg;
  });
  let gapRemaining=p.missingKg;
  const candidates=candidatePool.map(c=>{
   const suggestedKg=status==='missing_minimum'?qty(Math.min(gapRemaining>0?gapRemaining:c.availableKg,c.availableKg)):c.availableKg;
   if(status==='missing_minimum'&&gapRemaining>0)gapRemaining=qty(Math.max(0,gapRemaining-suggestedKg));
   return {...c,suggestedKg};
  });
  const candidateSupplyKg=qty(candidates.reduce((s,c)=>s+c.availableKg,0));
  const profitShortfall=status==='negative_profit'?round(Math.abs(p.netProfit??0)):null;
  return {
   status,
   missingKg:p.missingKg,
   requiredKg:p.requiredKg,
   pooledKg:p.quantityKg,
   netProfit:p.netProfit,
   profitShortfall,
   canCloseGap:status==='missing_minimum'?(p.missingKg>0&&candidateSupplyKg>=p.missingKg):candidates.length>0,
   candidateSupplyKg,
   candidates,
  };
 };

 if(!p.complete){
  p.reason=`${p.quantityKg} kg of compatible material recorded; ${p.missingKg} kg still needed. Complete the pool before comparing savings.`;
  p.gapCard=buildGapCard('missing_minimum');
  return p;
 }
 p.savings=round(p.baselineCost-p.totalCost);p.netProfit=p.savings;p.viable=p.savings>0;
 p.reason=p.viable?'The recorded quantities meet this requirement at a lower estimated delivered cost.':'The estimated delivered cost meets or exceeds your comparison cost.';
 if(p.netProfit<0)p.gapCard=buildGapCard('negative_profit');
 return p;
}

export function calculateImpact(savedPlans=[],records=undefined,factorsMap=CO2_FACTORS) {
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 const qty=n=>Math.round(n*1000000)/1000000;
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 const pos=v=>finite(v)&&v>0;
 const plansList=Array.isArray(savedPlans)?savedPlans:[];
 const hasRecordsArg=Array.isArray(records);
 const confirmedRecordMap=hasRecordsArg
  ?new Map(records.filter(r=>r&&r.confirmed===true&&pos(r.quantityKg)&&pos(r.pricePerKg)).map(r=>[r.id,r]))
  :null;

 let sellerEarningsInr=0;
 let buyerSavingsInr=0;
 let scrapDivertedKg=0;
 let knownCo2AvoidedKg=0;
 let knownCo2PlanCount=0;
 let excludedPlanCount=0;
 const materialMap=new Map();
 const missingCo2Set=new Set();
 const planSummaries=[];

 for(const rawPlan of plansList){
  if(!rawPlan||typeof rawPlan!=='object'){excludedPlanCount++;continue;}
  let p=rawPlan;
  if(!Array.isArray(p.allocations)&&hasRecordsArg){
   p=planPool(records,p.requirements||p);
  }
  if(p.complete===false||!Array.isArray(p.allocations)||!p.allocations.length){
   excludedPlanCount++;
   continue;
  }
  const validAllocations=[];
  let planValid=true;
  for(const a of p.allocations){
   if(!a||!pos(a.quantityKg)||(!pos(a.pricePerKg)&&!pos(a.payout))){planValid=false;break;}
   if(confirmedRecordMap&&a.recordId){
    const rec=confirmedRecordMap.get(a.recordId);
    if(!rec){planValid=false;break;}
   }
   validAllocations.push(a);
  }
  if(!planValid||!validAllocations.length){
   excludedPlanCount++;
   continue;
  }

  const planDivertedKg=qty(validAllocations.reduce((s,a)=>s+a.quantityKg,0));
  const planEarnedInr=round(validAllocations.reduce((s,a)=>s+(finite(a.payout)?a.payout:round(a.quantityKg*a.pricePerKg)),0));
  let planSavedInr=0;
  if(finite(p.savings)){
   planSavedInr=round(p.savings);
  }else if(finite(p.baselineCost)&&finite(p.totalCost)){
   planSavedInr=round(p.baselineCost-p.totalCost);
  }else if(pos(p.comparisonPrice)){
   const transport=finite(p.transportCost)&&p.transportCost>=0?round(p.transportCost):0;
   const feePct=finite(p.feePercent)&&p.feePercent>=0?p.feePercent:0;
   const fee=finite(p.fee)?round(p.fee):round(planEarnedInr*feePct/100);
   const totalCost=round(planEarnedInr+transport+fee);
   const baseline=round(planDivertedKg*p.comparisonPrice);
   planSavedInr=round(baseline-totalCost);
  }

  const matName=String(p.material||validAllocations[0]?.material||'Unknown').trim()||'Unknown';
  const factorInfo=getCo2Factor(matName,factorsMap);
  const planCo2Kg=factorInfo.hasFactor?round(planDivertedKg*factorInfo.kgCo2PerKg):null;

  sellerEarningsInr=round(sellerEarningsInr+planEarnedInr);
  buyerSavingsInr=round(buyerSavingsInr+planSavedInr);
  scrapDivertedKg=qty(scrapDivertedKg+planDivertedKg);
  if(factorInfo.hasFactor){
   knownCo2AvoidedKg=round(knownCo2AvoidedKg+planCo2Kg);
   knownCo2PlanCount++;
  }else{
   missingCo2Set.add(factorInfo.material||matName);
  }

  const mKey=factorInfo.key||matName.toUpperCase();
  const existing=materialMap.get(mKey)||{
   key:mKey,
   material:factorInfo.material||matName,
   label:factorInfo.label||matName,
   planCount:0,
   quantityKg:0,
   scrapDivertedKg:0,
   sellerEarningsInr:0,
   buyerSavingsInr:0,
   co2Factor:factorInfo.kgCo2PerKg,
   hasCo2Factor:factorInfo.hasFactor,
   estimatedCo2AvoidedKg:factorInfo.hasFactor?0:null,
   displayCo2:factorInfo.hasFactor?'0 kg CO2e':'Not enough data',
   source:factorInfo.source,
   note:factorInfo.note,
   isEstimate:true,
   todo:factorInfo.todo||null,
  };
  existing.planCount+=1;
  existing.quantityKg=qty(existing.quantityKg+planDivertedKg);
  existing.scrapDivertedKg=existing.quantityKg;
  existing.sellerEarningsInr=round(existing.sellerEarningsInr+planEarnedInr);
  existing.buyerSavingsInr=round(existing.buyerSavingsInr+planSavedInr);
  if(existing.hasCo2Factor){
   existing.estimatedCo2AvoidedKg=round(existing.quantityKg*existing.co2Factor);
   existing.displayCo2=`${existing.estimatedCo2AvoidedKg} kg CO2e`;
  }else{
   existing.estimatedCo2AvoidedKg=null;
   existing.displayCo2='Not enough data';
  }
  materialMap.set(mKey,existing);

  planSummaries.push({
   id:p.id||null,
   title:p.title||`${matName}${p.grade?` (${p.grade})`:''} · ${planDivertedKg} kg pool`,
   createdAt:p.createdAt||null,
   material:factorInfo.material||matName,
   grade:p.grade||null,
   quantityKg:planDivertedKg,
   scrapDivertedKg:planDivertedKg,
   sellerEarningsInr:planEarnedInr,
   buyerSavingsInr:planSavedInr,
   co2Factor:factorInfo.kgCo2PerKg,
   hasCo2Factor:factorInfo.hasFactor,
   estimatedCo2AvoidedKg:planCo2Kg,
   displayCo2:factorInfo.hasFactor?`${planCo2Kg} kg CO2e`:'Not enough data',
   co2Source:factorInfo.source,
   co2Note:factorInfo.note,
   co2Todo:factorInfo.todo||null,
   allocationCount:validAllocations.length,
  });
 }

 const planCount=planSummaries.length;
 const missingCo2Materials=[...missingCo2Set];
 const byMaterial=[...materialMap.values()];
 let co2Status='empty';
 let estimatedCo2AvoidedKg=0;
 if(planCount>0){
  if(knownCo2PlanCount===0){
   co2Status='not_enough_data';
   estimatedCo2AvoidedKg=null;
  }else if(missingCo2Materials.length>0){
   co2Status='partial';
   estimatedCo2AvoidedKg=knownCo2AvoidedKg;
  }else{
   co2Status='complete';
   estimatedCo2AvoidedKg=knownCo2AvoidedKg;
  }
 }
 const hasEnoughCo2Data=planCount>0&&missingCo2Materials.length===0;
 const displayCo2=co2Status==='not_enough_data'?'Not enough data':`${estimatedCo2AvoidedKg} kg CO2e`;

 return {
  planCount,
  excludedPlanCount,
  sellerEarningsInr,
  totalEarnedBySellers:sellerEarningsInr,
  buyerSavingsInr,
  totalSavedByBuyers:buyerSavingsInr,
  scrapDivertedKg,
  totalScrapDivertedKg:scrapDivertedKg,
  estimatedCo2AvoidedKg,
  totalCo2AvoidedKg:estimatedCo2AvoidedKg,
  knownCo2AvoidedKg,
  co2Status,
  hasEnoughCo2Data,
  displayCo2,
  missingCo2Materials,
  byMaterial,
  planSummaries,
 };
}

planPool.calculateImpact = calculateImpact;
planPool.CO2_FACTORS = CO2_FACTORS;
planPool.CO2_FACTOR_LIST = CO2_FACTOR_LIST;
planPool.getCo2Factor = getCo2Factor;
planPool.DEMO_COMPATIBILITY_RULES = DEMO_COMPATIBILITY_RULES;
planPool.DEMO_RULES = DEMO_RULES;
planPool.DEMO_FACTORIES = DEMO_FACTORIES;
planPool.normalizeCompatibilityRules = normalizeCompatibilityRules;
planPool.isMaterialCompatible = isMaterialCompatible;
planPool.normalizeFactoryNodes = normalizeFactoryNodes;
planPool.buildLoopEdges = buildLoopEdges;
planPool.buildLoopGraph = buildLoopGraph;
planPool.findLoopChains = findLoopChains;
planPool.findChains = findChains;
