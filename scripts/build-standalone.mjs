/** Keep the file-openable planning desk aligned with sourced data and shared calculations. */
import {readFileSync,writeFileSync} from 'node:fs';
const template=readFileSync('design/standalone/index.template.html','utf8');
const bundle=JSON.parse(readFileSync('data/public-facilities.json','utf8'));
const asScript=value=>value.replaceAll('</script','<\\/script');
const planner=readFileSync('dist/planner.js','utf8').replaceAll('export function','function');
const exporter=readFileSync('dist/estimate.js','utf8').replaceAll('export function','function');
writeFileSync('index.html',template.replace('__PUBLIC_DATA__',asScript(JSON.stringify(bundle))).replace('__PLANNER__',asScript(planner)).replace('__EXPORT__',asScript(exporter)));
console.log('Built root index.html using actual source records and shared planner logic.');
