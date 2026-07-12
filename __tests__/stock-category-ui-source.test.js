const fs = require('fs');
const path = require('path');

describe('stock category delete UI source guards', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'jbm', 'JbmProAutoApp.jsx'),
    'utf8'
  );

  it('จัดการ HTTP 409 CATEGORY_IN_USE ด้วย modal เฉพาะ ไม่ใช่ alert ทั่วไปอย่างเดียว', () => {
    expect(source).toContain('StockCategoryDeleteDialog');
    expect(source).toContain("deleteError?.code === 'CATEGORY_IN_USE'");
    expect(source).toContain('ไม่สามารถลบหมวดหมู่นี้ได้');
    expect(source).toContain('ย้ายสินค้าแล้วลบหมวดหมู่');
  });

  it('ปุ่มลบหมวดหมู่ไม่ถูก disable เมื่อมีสินค้า เพื่อให้เข้า flow ย้ายสินค้าได้', () => {
    expect(source).toContain("title={count > 0 ? 'ลบหรือย้ายสินค้าไปหมวดอื่นก่อนลบ' : 'ลบหมวดหมู่'}");
    expect(source).not.toContain('disabled={count > 0}');
  });

  it('ไม่แสดง success ก่อน API สำเร็จ', () => {
    const dialogStart = source.indexOf('function StockCategoryDeleteDialog');
    const dialogEnd = source.indexOf('function StockModalHeader');
    const dialogSource = source.slice(dialogStart, dialogEnd);
    expect(dialogSource).toContain('await onDelete(category');
    expect(dialogSource).toContain('onSuccess(');
    expect(dialogSource.indexOf('await onDelete(category')).toBeLessThan(dialogSource.indexOf('onSuccess('));
  });
});
