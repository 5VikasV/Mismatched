// Rebuild paired PDF/JPG upload fixtures from the locked local dataset.
// No model training, provider calls, database writes or network requests.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'samples/material-upload-pack');
const manifest = JSON.parse(await readFile(path.join(root, 'ml/manifest.json'), 'utf8'));
const products = [
  { material: 'plastic', title: 'Plastic packaging inserts', quantityKg: 1200, pricePerKg: 35, description: 'White moulded plastic packaging insert. Polymer identity is not established by the photograph.', visible: 'A light-coloured moulded packaging piece on a plain surface.' },
  { material: 'metal', title: 'Crumpled metal foil', quantityKg: 750, pricePerKg: 85, description: 'Crumpled metallic foil packaging. Alloy, coating and contamination are unverified.', visible: 'Reflective, crumpled foil with coloured areas; composition and cleanliness need review.' },
  { material: 'glass', title: 'Used glass jars', quantityKg: 2000, pricePerKg: 6, description: 'Used glass container with a label. Glass composition and suitability for a buyer are unverified.', visible: 'A transparent jar lying on its side, with label residue visible.' },
  { material: 'cardboard', title: 'Corrugated cardboard packaging', quantityKg: 1000, pricePerKg: 12, description: 'Brown cardboard packaging with printing. Board specification and moisture content are unverified.', visible: 'Brown packaging board with a printed mark and visible folds.' },
  { material: 'paper', title: 'Moulded paper pulp packaging', quantityKg: 800, pricePerKg: 10, description: 'Moulded fibre packaging, labelled paper in the source dataset. Fibre composition and additives are unverified.', visible: 'A coloured moulded packaging tray with rounded compartments.' },
  { material: 'plastic', fileLabel: 'Plastic_Bottles', originalPath: 'dataset-resized/plastic/plastic227.jpg', title: 'Used plastic bottles', quantityKg: 600, pricePerKg: 28, description: 'Transparent beverage bottle with a cap and label. Exact polymer and suitability for recycling are not established by this photograph.', visible: 'A transparent, ribbed beverage bottle with a red label and cap. Added as a visually clearer bottle example, before running inference on it.' },
];
const css = `
  *{box-sizing:border-box}body{margin:0;color:#242923;background:#f7f7f2;font:13px/1.5 Arial,sans-serif}
  main{max-width:1000px;margin:auto;padding:32px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #252a25;padding-bottom:14px}
  .brand{font-size:22px;font-weight:800;letter-spacing:-1px}.eyebrow{font:10px/1.5 monospace;letter-spacing:1.2px;text-transform:uppercase;color:#697167}
  .badge{display:inline-block;color:#a63716;background:#ffeadf;padding:7px 10px;font-size:10px;font-weight:700;margin-top:20px}
  h1{font-size:29px;line-height:1.12;margin:14px 0 10px;letter-spacing:-1px}h2{font-size:16px;margin:0 0 8px}p{margin:8px 0}
  .intro{color:#60675e}.identity{display:grid;grid-template-columns:1.1fr 1fr;gap:24px;margin:20px 0}
  figure{margin:0;background:white;border:1px solid #d8ddcf;padding:10px}img{width:100%;height:198px;object-fit:contain}figcaption{font-size:10px;color:#687062;margin-top:8px}
  dl{margin:0}dt{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6a7167;margin-top:12px}dd{margin:2px 0;font-weight:600}
  table{width:100%;border-collapse:collapse;background:white}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #dde1d5}th{width:40%;font-weight:400;color:#58614f}
  .notes{margin-top:18px;border-left:3px solid #fa5a25;padding-left:14px}.notice{font-size:10px;color:#62695d;border-top:1px solid #cdd3c5;padding-top:12px;margin-top:18px}
  a{color:#943512}.links{display:flex;gap:14px;flex-wrap:wrap;margin:14px 0 25px}.index-item{background:white;border:1px solid #d8ddcf;padding:22px;margin:18px 0}.index-item img{max-width:240px}
  @page{size:A4;margin:13mm} @media print{body{background:white}main{padding:0;max-width:none}.links{display:none}}
`;
const html = (title, content) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>${css}</style></head><body><main>${content}</main></body></html>`;
await mkdir(output, { recursive: true });
// Retain the original upstream license alongside redistributed photographs.
await readFile(path.join(output, 'TRASHNET-LICENSE.txt'), 'utf8');
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  headless: true,
});
const files = [];
try {
  const page = await browser.newPage();
  for (const [index, item] of products.entries()) {
    // First five are the first held-out entries; the extra bottle was chosen by visual inspection, before inference.
    const source = manifest.images.find(row => row.label === item.material && row.split === 'test' && (!item.originalPath || row.originalPath === item.originalPath));
    if (!source) throw new Error(`Missing held-out photograph: ${item.material}`);
    const bytes = await readFile(path.join(root, 'ml', source.path));
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== source.sha256) throw new Error(`Image hash mismatch: ${source.originalPath}`);
    const stem = `ScrapLoop_${item.fileLabel || item.material[0].toUpperCase() + item.material.slice(1)}_Sample`;
    await copyFile(path.join(root, 'ml', source.path), path.join(output, `${stem}.jpg`));
    const subtotal = item.quantityKg * item.pricePerKg;
    const reference = `SAMPLE-${item.material.toUpperCase()}-${String(index + 1).padStart(3, '0')}`;
    const location = 'Pune, Maharashtra, India (sample lot location)';
    const company = `ScrapLoop ${item.material[0].toUpperCase() + item.material.slice(1)} Test Supplier`;
    const document = html(item.title, `
      <header><span class="brand">SCRAPLOOP</span><span class="eyebrow">Material declaration / ${reference}</span></header>
      <div class="badge">SAMPLE DATA · FOR UPLOAD TESTING ONLY</div>
      <h1>${item.title}</h1><p class="intro">${item.description}</p>
      <div class="identity"><div><dl><dt>Company</dt><dd>${company}</dd><dt>Material / family</dt><dd>${item.material}</dd><dt>Grade</dt><dd>Not verified</dd><dt>Condition</dt><dd>Unknown — manual review required</dd></dl></div>
      <figure><img alt="Real illustrative ${item.material} photograph" src="data:image/jpeg;base64,${bytes.toString('base64')}"><figcaption>REAL ILLUSTRATIVE PHOTO · TrashNet, Gary Thung &amp; Mindy Yang. Not a photograph of the invented commercial lot.</figcaption></figure></div>
      <table><tbody><tr><th>Record title</th><td>SAMPLE — ${item.title}</td></tr><tr><th>Quantity (kg)</th><td>${item.quantityKg.toLocaleString('en-IN')} kg</td></tr><tr><th>Price per kg (INR)</th><td>INR ${item.pricePerKg.toFixed(2)} / kg</td></tr><tr><th>Material subtotal (INR)</th><td>INR ${subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td></tr><tr><th>Location</th><td>${location}</td></tr><tr><th>Latitude / longitude</th><td>Not supplied</td></tr></tbody></table>
      <div class="notes"><h2>Visible features &amp; review notes</h2><p>${item.visible}</p><p>No exact grade, purity, contamination measurement or quality certification is provided. The single-object photo cannot establish a bulk lot's quantity, weight, price or availability.</p></div>
      <div class="notice"><strong>All commercial details above are invented.</strong> This is not an invoice, live price, available-stock offer, compliance record or evidence of a real supplier. Fees, taxes and transport are excluded. Do not confirm grade or cleanliness without evidence.<br>Photo: ${source.originalPath} · TrashNet · MIT license. Source: <a href="https://huggingface.co/datasets/garythung/trashnet">garythung/trashnet</a>. Dataset label: ${source.label}; not expert-confirmed. Existing held-out test image, not a new independent evaluation.</div>
    `);
    await page.setContent(document);
    await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); await document.fonts.ready; });
    await page.pdf({path: path.join(output, `${stem}.pdf`), format: 'A4', printBackground: true, preferCSSPageSize: true});
    files.push({...item, reference, company, location, grade: null, condition: null, subtotal, pdf: `${stem}.pdf`, photo: `${stem}.jpg`, photoSource: {authors: ['Gary Thung', 'Mindy Yang'], dataset: 'TrashNet', url: 'https://huggingface.co/datasets/garythung/trashnet', originalPath: source.originalPath, sha256, split: source.split, labelProvenance: source.labelProvenance, expertConfirmed: false, license: 'MIT'}, sampleCommercialData: true});
  }
  const original = html('ScrapLoop material analysis sample', `
    <header><span class="brand">SCRAPLOOP</span><span class="eyebrow">Material declaration / SAMPLE-PP-001</span></header>
    <div class="badge">SAMPLE DATA · FOR UPLOAD TESTING ONLY</div>
    <h1>Polypropylene manufacturing trimmings</h1>
    <p class="intro">Single-material lot declaration for testing document extraction.</p>
    <table><tbody>${[
      ['Company', 'ScrapLoop Test Factory'], ['Material', 'PP'],
      ['Material description', 'Polypropylene pre-consumer manufacturing trimmings'],
      ['Grade', 'PP-H'], ['Condition', 'Clean'], ['Quantity (kg)', '1,200 kg'],
      ['Price per kg (INR)', 'INR 42.00 / kg'], ['Material subtotal (INR)', 'INR 50,400.00'],
      ['Location', 'Pune, Maharashtra, India (example location)'], ['Packaging', '12 bags of 100 kg each'],
    ].map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join('')}</tbody></table>
    <div class="notes"><h2>Supplier-declared material notes</h2>
    <p>Segregated, dry polypropylene trimmings from a single manufacturing stream. No mixed plastics or visible oil are reported in this sample lot.</p>
    <p>Grade and condition are sample supplier declarations for testing. No laboratory testing, purity measurement, hazardous-waste determination or quality certification is supplied.</p></div>
    <div class="notice">This document contains sample test data. It is not a genuine commercial invoice, live price quote, available-stock listing, compliance document or proof of delivery. Transport, platform fees and taxes are excluded from the illustrative material subtotal.</div>
  `);
  await page.setContent(original);
  const originalPath = path.join(root, 'samples/ScrapLoop_Material_Analysis_Sample.pdf');
  await page.pdf({path: originalPath, format: 'A4', printBackground: true, preferCSSPageSize: true});
  await copyFile(originalPath, path.join(root, 'dist/assets/ScrapLoop_Material_Analysis_Sample.pdf'));
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify({purpose: 'Paired PDF / real-photo upload fixtures; not a benchmark or real supplier stock', files}, null, 2) + '\n');
  await writeFile(path.join(output, 'index.html'), html('ScrapLoop material upload samples', `
    <header><span class="brand">SCRAPLOOP</span><span class="eyebrow">Material upload kit / ${files.length} pairs</span></header>
    <h1>Five material families. Six upload pairs.</h1>
    <p>Upload the <strong>PDF</strong> to extract sample lot details through your configured document provider. Upload the <strong>JPG</strong> for a broad material suggestion from the local model. Files are separate uploads; a photo does not supply weight or prices.</p>
    <div class="badge">SAMPLE LOT DATA · REAL ILLUSTRATIVE PHOTOS</div>
    ${files.map(item => `<section class="index-item"><h2>${item.title}</h2><p>${item.quantityKg.toLocaleString('en-IN')} kg · INR ${item.pricePerKg} / kg · illustrative subtotal INR ${item.subtotal.toLocaleString('en-IN')}</p><img src="${item.photo}" alt="${item.title}"><div class="links"><a href="${item.pdf}">Open PDF</a><a href="${item.photo}">Open original JPG</a></div><p>${item.description}</p><p class="eyebrow">Dataset label: ${item.material} · Grade and condition unverified</p></section>`).join('')}
    <p>Real photos: Gary Thung and Mindy Yang, <a href="https://huggingface.co/datasets/garythung/trashnet">TrashNet</a>. <a href="TRASHNET-LICENSE.txt">MIT license</a>. Photos are unchanged, isolated-object examples from the existing held-out split. These examples do not establish industrial accuracy. The white plastic insert is a retained model failure case; see local-inference-results.json.</p>
  `));
  console.log(`Created ${files.length} PDF/JPG pairs in ${output}`);
} finally { await browser.close(); }
