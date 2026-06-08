const fs = require('fs');
const path = require('path');
const outputPath = path.join('db','seed_mock_vehicles_2025_2034.sql');
if (!fs.existsSync(outputPath)) {
  console.error(`File not found: ${outputPath}`);
  process.exit(1);
}
const text = fs.readFileSync(outputPath, 'utf8').replace(/\r\n/g, '\n');
const lines = text.split('\n').filter(l => l.trim());
if (lines.length < 2) {
  console.error('Unexpected seed file format: no second line with VALUES.');
  process.exit(1);
}
const line = lines[1];
const m = line.match(/VALUES\s*\((.*)\)\s*;\s*$/i);
if (!m) {
  console.error('Unexpected seed file format: could not parse VALUES clause.');
  process.exit(1);
}
const raw = m[1];
const values = [];
let cur = '';
let inString = false;
let escape = false;
for (let i = 0; i < raw.length; i++) {
  const ch = raw[i];
  if (escape) { cur += ch; escape = false; continue; }
  if (ch === "'") { inString = !inString; cur += ch; continue; }
  if (ch === '\\') { escape = true; cur += ch; continue; }
  if (!inString && ch === ',') { values.push(cur.trim()); cur = ''; continue; }
  cur += ch;
}
if (cur.length) values.push(cur.trim());
console.log('count', values.length);
console.log('phone raw', values[3]);
const phone = values[3].replace(/^'(.*)'$/s, '$1').replace(/''/g, "'");
console.log('phone=', phone, 'len', phone.length, 'chars', Array.from(phone).map(c=>c.charCodeAt(0)).join(','));
const vin = values[15].replace(/^'(.*)'$/s, '$1');
console.log('vin=', vin, 'len', vin.length);
