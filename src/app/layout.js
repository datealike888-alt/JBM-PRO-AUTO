import './globals.css';

export const metadata = {
  title: 'JBM Pro Auto | ระบบติดตามงานซ่อมรถยนต์ยุโรป',
  description: 'ระบบติดตามงานซ่อมและจัดการคิวสำหรับอู่ซ่อมรถยุโรป JBM Pro Auto',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className="bg-white">
      <body className="bg-white text-slate-900">{children}</body>
    </html>
  );
}
