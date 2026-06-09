const fs = require('fs');
const path = require('path');

const brands = {
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE', 'GLS', 'CLA', 'CLS'],
  BMW: ['Series 3', 'Series 5', 'Series 7', 'X1', 'X3', 'X5', 'X6'],
  Audi: ['A3', 'A4', 'A5', 'A6', 'Q3', 'Q5', 'Q7'],
  Volvo: ['XC40', 'XC60', 'XC90', 'S60', 'S90'],
  Porsche: ['Cayenne', 'Macan', 'Panamera', '911', 'Cayman', 'Boxster'],
  MINI: ['Cooper', 'Countryman', 'Clubman'],
  Toyota: ['Camry', 'Corolla Cross', 'Fortuner'],
  Honda: ['Civic', 'Accord', 'CR-V'],
};
const colors = ['Black', 'White', 'Silver', 'Blue', 'Red', 'Grey'];
const statuses = ['จองคิว', 'กำลังตรวจเช็ค', 'รออะไหล่', 'กำลังซ่อม', 'ซ่อมเสร็จรอส่ง'];

const quote = (value) => {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
};
const pad = (number) => String(number).padStart(3, '0');
const rows = [];

for (let i = 1; i <= 200; i += 1) {
  const brandKeys = Object.keys(brands);
  const brand = brandKeys[Math.floor(Math.random() * brandKeys.length)];
  const model = brands[brand][Math.floor(Math.random() * brands[brand].length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const booking = new Date(2025, Math.floor(Math.random() * 24), Math.floor(Math.random() * 28) + 1);
  const bookingDate = booking.toISOString().slice(0, 10);
  const estimated = new Date(booking);
  estimated.setDate(estimated.getDate() + Math.ceil(Math.random() * 14));

  const values = [
    `job-seed-${pad(i)}`,
    `INV-${100000 + i}`,
    `กข ${Math.floor(1000 + Math.random() * 9000)}`,
    `ลูกค้า_${i}`,
    `090${Math.floor(1000000 + Math.random() * 9000000)}`,
    brand,
    model,
    colors[Math.floor(Math.random() * colors.length)],
    `VIN${Math.floor(1000000000000000 + Math.random() * 8999999999999999)}`,
    Math.floor(10000 + Math.random() * 180000),
    status,
    Math.floor(5000 + Math.random() * 95000),
    bookingDate,
    estimated.toISOString().slice(0, 10),
    `บันทึกเคส ${brand} ${model}`,
    `https://example.com/receipt-${i}.jpg`,
  ];

  rows.push(`(${values.map(quote).join(', ')})`);
}

const sql = `USE jbm_pro_auto;
INSERT IGNORE INTO vehicles (
  id, invoice_number, license_plate, owner_name, phone, brand, model, color, vin, mileage,
  status, repair_cost, booking_date, estimated_completion_date, status_detail, receipt_image
) VALUES
${rows.join(',\n')};
`;

const filePath = path.join(__dirname, '..', 'db', 'seed_vehicles.sql');
fs.writeFileSync(filePath, sql, 'utf8');
console.log(`Wrote seed SQL to ${filePath}`);
