const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../src');

// Regex to find DDL statements and specific helper functions
const pattern = /(CREATE\s+TABLE|ALTER\s+TABLE|CREATE\s+(UNIQUE\s+)?INDEX|ADD\s+COLUMN|DROP\s+TABLE|INSERT\s+IGNORE|ensureTable|ensureColumn|ensureIndex|ensureSchema)/gi;

let totalMatches = 0;
let fileMatches = {};

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(pattern);
      if (matches) {
        totalMatches += matches.length;
        fileMatches[fullPath.replace(path.join(__dirname, '..'), '')] = matches.length;
      }
    }
  }
}

scanDir(targetDir);

console.log('--- DDL Match Count Report ---');
for (const [file, count] of Object.entries(fileMatches)) {
  console.log(`${file}: ${count} matches`);
}
console.log(`\nTotal Matches in src/: ${totalMatches}`);
