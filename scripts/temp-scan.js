const fs = require('fs');
const path = require('path');

const targetWords = [
  'ensureCashReserveTable',
  'ensureFinancialTransactionsTable',
  'ensurePaymentDebtTables',
  'ensureSupplierPayableTable'
];

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
          console.log(`Found ${word} in ${fullPath}`);
        }
      });
    }
  }
}

scanDir(path.join(__dirname, 'src'));
console.log('Scan complete.');
