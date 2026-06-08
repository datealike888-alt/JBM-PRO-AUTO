const fs = require('fs');
const path = require('path');

const brands = {
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE'],
  BMW: ['3 Series', '5 Series', 'X5', 'X3', 'i8'],
  Audi: ['A4', 'A6', 'Q5', 'Q7', 'e-tron'],
  Volvo: ['XC40', 'XC60', 'XC90', 'S60', 'V60'],
  Porsche: ['911', 'Cayenne', 'Panamera', 'Macan', 'Taycan'],
};
const colors = ['Black', 'White', 'Silver', 'Blue', 'Red', 'Green', 'Grey', 'Beige'];
const statusTexts = ['จองคิวรับบริการล่วงหน้า', 'ตรวจเช็คเบื้องต้น', 'รออะไหล่', 'กำลังซ่อม', 'เสร็จรอส่ง'];
const times = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '14:00', '15:00'];

const pad = (n) => n.toString().padStart(3, '0');
const rows = [];
for (let i = 1; i <= 200; i += 1) {
  const brandKeys = Object.keys(brands);
  const brand = brandKeys[Math.floor(Math.random() * brandKeys.length)];
  const model = brands[brand][Math.floor(Math.random() * brands[brand].length)];
  const status = Math.ceil(Math.random() * 5);
  const entry = new Date(2025, Math.floor(Math.random() * 24), Math.floor(Math.random() * 28) + 1);
  const entryDate = entry.toISOString().slice(0, 10);
  const est = new Date(entry);
  est.setDate(est.getDate() + Math.ceil(Math.random() * 14));
  const estimatedCompletion = est.toISOString().slice(0, 10);
  const receiptNo = `REC-${100000 + i}`;
  const id = `job-seed-${pad(i)}`;
  const phone = `090${Math.floor(1000000 + Math.random() * 9000000)}`;
  const plateNo = `กข ${Math.floor(1000 + Math.random() * 9000)}`;
  const color = colors[Math.floor(Math.random() * colors.length)];
  const cost = Math.floor(5000 + Math.random() * 95000);
  const receiptName = `receipt-${i}.jpg`;
  const receiptUrl = `https://example.com/receipt-${i}.jpg`;
  const logEntry = [{
    date: `${entryDate} ${times[Math.floor(Math.random() * times.length)]}`,
    text: `บันทึกเคส ${receiptNo} สำหรับรถ ${brand} ${model}`,
  }];
  const logJson = JSON.stringify(logEntry).replace(/'/g, "\\'");

  rows.push(`('${id}','${receiptNo}','ลูกค้า_${i}','${phone}','${plateNo}','${brand}','${model}','${color}',${status},'${statusTexts[status - 1]}','${entryDate}','${times[Math.floor(Math.random() * times.length)]}','${estimatedCompletion}',${cost},'VIN${Math.floor(1000000000000000 + Math.random() * 8999999999999999)}','${receiptName}','${receiptUrl}','${logJson}')`);
}

const sql = `USE jbm_pro_auto;\nINSERT IGNORE INTO vehicles (id, receiptNo, ownerName, phone, plateNo, brand, model, color, status, statusText, entryDate, bookingTime, estimatedCompletion, cost, vin, receiptName, receiptUrl, logs) VALUES\n${rows.join(',\n')};\n`;
const filePath = path.join(__dirname, '..', 'db', 'seed_vehicles.sql');
fs.writeFileSync(filePath, sql, 'utf8');
console.log(`Wrote seed SQL to ${filePath}`);
