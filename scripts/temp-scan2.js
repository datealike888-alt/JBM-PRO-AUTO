const fs = require('fs');
const path = require('path');

const targetWords = [
  'ensureCashReserveTable',
  'ensureFinancialTransactionsTable',
  'ensurePaymentDebtTables',
  'ensureSupplierPayableTable'
];

const results = [];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      targetWords.forEach(word => {
        if (content.includes(word)) {
          results.push(`Found ${word} in ${fullPath}`);
        }
      });
    }
  }
}

scanDir(path.join(__dirname, '../src'));

fs.writeFileSync(path.join(__dirname, 'scan-results.txt'), results.length > 0 ? results.join('\n') : '0 Matches');
console.log('Scan complete.');
