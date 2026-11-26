import { eligibilityReasons } from './planner.js';
const norm = value => String(value ?? '').trim().toUpperCase();
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
export function savedMaterialDefaults(records, material) {
  if (!norm(material)) return null;
  const matches = records.filter(record => norm(record.material) === norm(material));
  const ranked = matches.map(record => ({record, reasons: eligibilityReasons(record, {material, grade: record.grade})}))
    .sort((a,b) => Number(Boolean(a.reasons.length))-Number(Boolean(b.reasons.length)) || (positive(a.record.pricePerKg)?a.record.pricePerKg:Infinity)-(positive(b.record.pricePerKg)?b.record.pricePerKg:Infinity) || String(a.record.id).localeCompare(String(b.record.id)));
  const first = ranked[0];
  return first ? {recordId:first.record.id, title:first.record.title, quantityKg:positive(first.record.quantityKg)?first.record.quantityKg:null, pricePerKg:positive(first.record.pricePerKg)?first.record.pricePerKg:null, blockers:first.reasons} : null;
}
export function sampleMaterialDefaults(material) {
  const rows = {
    PP: ['PP','PP-H',1200,42,75,'PP manufacturing trimmings'],
    POLYPROPYLENE: ['Polypropylene','PP-H',1200,42,75,'Polypropylene manufacturing trimmings'],
    PAPER: ['paper','Sample moulded pulp packaging',800,10,15,'Paper packaging'],
    CARDBOARD: ['cardboard','Sample corrugated packaging',1000,12,18,'Cardboard packaging'],
    GLASS: ['glass','Sample container glass',2000,6,10,'Glass jars'],
    METAL: ['metal','Sample foil packaging',750,85,120,'Metal foil'],
    PLASTIC: ['plastic','Sample plastic packaging',1200,35,50,'Plastic packaging'],
    PET: ['PET','Sample PET packaging',600,28,40,'PET packaging'],
    HDPE: ['HDPE','Sample HDPE packaging',1200,35,50,'HDPE packaging'],
  };
  const row=rows[norm(material)||'PP'];
  return row ? {material:row[0],grade:row[1],quantityKg:row[2],pricePerKg:row[3],comparisonPrice:row[4],title:row[5]} : null;
}
