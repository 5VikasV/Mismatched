export function planPool(records,requirements={}) {
 const {material,grade,quantityKg,comparisonPrice,transportCost=0,feePercent=0}=requirements;
 const round=n=>Math.round((n+Number.EPSILON)*100)/100,qty=n=>Math.round(n*1000000)/1000000,norm=v=>String(v??'').trim().toUpperCase(),finite=v=>typeof v==='number'&&Number.isFinite(v);
 const p={viable:false,complete:false,reason:'',allocations:[],quantityKg:0,requiredKg:finite(quantityKg)?quantityKg:0,materialCost:0,transportCost,feePercent,fee:0,totalCost:0,baselineCost:0,savings:null,excludedCount:0};
 if(!norm(material)||!norm(grade))return {...p,reason:'Enter a material and confirmed grade to find compatible research records.'};
 if(![quantityKg,comparisonPrice].every(v=>finite(v)&&v>0)||!finite(transportCost)||transportCost<0||!finite(feePercent)||feePercent<0||feePercent>100)return {...p,reason:'Enter positive required quantity and comparison price, a non-negative pickup estimate, and a fee from 0 to 100%.'};
 const eligible=records.filter(r=>r.confirmed===true&&norm(r.material)===norm(material)&&norm(r.grade)===norm(grade)&&norm(r.condition)==='CLEAN'&&finite(r.quantityKg)&&r.quantityKg>0&&finite(r.pricePerKg)&&r.pricePerKg>0).sort((a,b)=>a.pricePerKg-b.pricePerKg||b.quantityKg-a.quantityKg);
 p.excludedCount=records.length-eligible.length;let needed=quantityKg;
 for(const r of eligible){if(needed<=.000001)break;const q=Math.min(needed,r.quantityKg);p.allocations.push({recordId:r.id,title:r.title,company:r.company||'Company not recorded',quantityKg:qty(q),pricePerKg:r.pricePerKg,payout:round(q*r.pricePerKg)});needed=qty(Math.max(0,needed-q));}
 p.quantityKg=qty(quantityKg-needed);p.materialCost=round(p.allocations.reduce((s,a)=>s+a.payout,0));p.fee=round(p.materialCost*feePercent/100);p.totalCost=round(p.materialCost+transportCost+p.fee);p.baselineCost=round(quantityKg*comparisonPrice);p.complete=needed<=.000001;
 if(!p.complete)return {...p,reason:`${p.quantityKg} kg of compatible material recorded; ${qty(needed)} kg still needed. Complete the pool before comparing savings.`};
 p.savings=round(p.baselineCost-p.totalCost);p.viable=p.savings>0;p.reason=p.viable?'The recorded quantities meet this requirement at a lower estimated delivered cost.':'The estimated delivered cost meets or exceeds your comparison cost.';return p;
}
