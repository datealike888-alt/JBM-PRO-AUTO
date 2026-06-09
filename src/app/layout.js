import './globals.css';

export const metadata = {
  title: 'JBM Pro Auto | ระบบติดตามงานซ่อมรถ',
  description: 'ระบบจัดการคิวซ่อม รายได้ และค้นหาสถานะรถสำหรับ JBM Pro Auto',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
