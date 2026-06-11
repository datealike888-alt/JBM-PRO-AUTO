import './globals.css';

export const metadata = {
  title: 'JBM PRO AUTO | ระบบติดตามงานซ่อมรถ',
  description: 'ระบบจัดการคิวซ่อม รายได้ และค้นหาสถานะรถสำหรับ JBM PRO AUTO',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
