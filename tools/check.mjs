import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root,'public');
const calculators = JSON.parse(fs.readFileSync(path.join(root,'content/calculators.json'),'utf8'));
const errors=[];
for (const calc of calculators) {
  const file=path.join(publicDir,calc.path.replace(/^\//,'').replace(/\/$/,''),'index.html');
  if(!fs.existsSync(file)) errors.push(`Missing: ${calc.path}`);
  else {
    const html=fs.readFileSync(file,'utf8');
    if(!html.includes(`data-calculator-id="${calc.id}"`)) errors.push(`Form id missing: ${calc.path}`);
    if(!html.includes('<link rel="canonical"')) errors.push(`Canonical missing: ${calc.path}`);
    if(!html.includes('<h1>')) errors.push(`H1 missing: ${calc.path}`);
    if(!html.includes('data-auto-calculate="true"')) errors.push(`Auto calculation marker missing: ${calc.path}`);
    if(!html.includes('id="liveCalculationStatus"')) errors.push(`Live calculation status missing: ${calc.path}`);
  }
}
for (const required of ['index.html','sitemap.xml','robots.txt','assets/styles.css','assets/site.js','assets/calculators.js','privacy/index.html','contact/index.html']) {
  if(!fs.existsSync(path.join(publicDir,required))) errors.push(`Required output missing: ${required}`);
}
const calculatorJs=fs.readFileSync(path.join(publicDir,'assets/calculators.js'),'utf8');
for (const requiredSnippet of ["form.addEventListener('input'", "form.addEventListener('change'", 'runInitialCalculation']) {
  if(!calculatorJs.includes(requiredSnippet)) errors.push(`Live calculation code missing: ${requiredSnippet}`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Check passed: ${calculators.length} calculator pages, live calculation, and required SEO/deployment files are present.`);
