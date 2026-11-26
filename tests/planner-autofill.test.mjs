import test from 'node:test';
import assert from 'node:assert/strict';
import {savedMaterialDefaults,sampleMaterialDefaults} from '../dist/planner-autofill.js';
test('autofill prefers eligible matching stock and reports incomplete records without changing them',()=>{
 const base={id:'a',title:'Paper',material:'paper',grade:'Packaging',condition:'Unknown',confirmed:true,quantityKg:800,pricePerKg:10};
 const before=structuredClone(base);
 const saved=savedMaterialDefaults([base],' PAPER ');
 assert.equal(saved.quantityKg,800);assert.equal(saved.pricePerKg,10);
 assert.ok(saved.blockers.some(reason=>reason.includes('Condition')));
 assert.deepEqual(base,before);
 assert.equal(savedMaterialDefaults([base],'glass'),null);
 assert.equal(savedMaterialDefaults([base],''),null);
 assert.ok(savedMaterialDefaults([{...base,condition:'Clean',grade:'Not verified'}],'paper').blockers.includes('Grade unknown'));
 const ready={...base,id:'b',condition:'Clean',pricePerKg:12};
 assert.equal(savedMaterialDefaults([base,ready],'paper').recordId,'b');
 assert.equal(sampleMaterialDefaults('paper').material,'paper');
 assert.equal(sampleMaterialDefaults('paper').comparisonPrice,15);
 assert.equal(sampleMaterialDefaults('unlisted material'),null);
});
