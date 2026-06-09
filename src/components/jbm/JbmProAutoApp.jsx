'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Banknote,
  Car,
  CheckCircle2,
  Clock,
  ClipboardList,
  Edit3,
  ExternalLink,
  Eye,
  Gauge,
  ImagePlus,
  Lock,
  Menu,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  Wrench,
  X,
} from 'lucide-react';

const API_URL = '/api/vehicles';
const DEFAULT_STATUS = 'จองคิว';
const FINAL_STATUS = 'ซ่อมเสร็จรอส่ง';
const CLOSED_STATUS = 'ปิดงาน';
const STATUS_OPTIONS = ['จองคิว', 'กำลังตรวจเช็ค', 'รออะไหล่', 'กำลังซ่อม', FINAL_STATUS, CLOSED_STATUS];
const BRAND_OPTIONS = [
  'Mercedes-Benz',
  'BMW',
  'Audi',
  'Volvo',
  'Porsche',
  'MINI',
  'Toyota',
  'Honda',
  'Isuzu',
  'Mazda',
  'Ford',
  'Nissan',
  'Mitsubishi',
  'Lexus',
  'Tesla',
  'อื่น ๆ',
];
const MODEL_OPTIONS = {
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE', 'GLS', 'CLA', 'CLS'],
  BMW: ['Series 3', 'Series 5', 'Series 7', 'X1', 'X3', 'X5', 'X6'],
  Audi: ['A3', 'A4', 'A5', 'A6', 'Q3', 'Q5', 'Q7'],
  Volvo: ['XC40', 'XC60', 'XC90', 'S60', 'S90'],
  Porsche: ['Cayenne', 'Macan', 'Panamera', '911', 'Cayman', 'Boxster'],
  MINI: ['Cooper', 'Countryman', 'Clubman'],
  Toyota: ['Camry', 'Corolla Cross', 'Fortuner', 'Alphard', 'Yaris'],
  Honda: ['Civic', 'Accord', 'CR-V', 'HR-V', 'City'],
  Isuzu: ['D-Max', 'MU-X'],
  Mazda: ['Mazda2', 'Mazda3', 'CX-3', 'CX-5', 'CX-8'],
  Ford: ['Ranger', 'Everest', 'Mustang'],
  Nissan: ['Almera', 'Kicks', 'Terra', 'Navara'],
  Mitsubishi: ['Triton', 'Pajero Sport', 'Xpander'],
  Lexus: ['IS', 'ES', 'RX', 'NX', 'LM'],
  Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X'],
};
const REPORT_YEARS = Array.from({ length: 12 }, (_, index) => 2025 + index);
const MONTHS_TH = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];
const STATUS_THEME = {
  จองคิว: {
    card: 'border-pink-200 bg-pink-50 text-pink-800',
    badge: 'border-pink-200 bg-pink-50 text-pink-800',
    button: 'border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100',
    chart: '#db2777',
  },
  กำลังตรวจเช็ค: {
    card: 'border-sky-200 bg-sky-50 text-sky-800',
    badge: 'border-sky-200 bg-sky-50 text-sky-800',
    button: 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100',
    chart: '#0284c7',
  },
  รออะไหล่: {
    card: 'border-orange-200 bg-orange-50 text-orange-800',
    badge: 'border-orange-200 bg-orange-50 text-orange-800',
    button: 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100',
    chart: '#ea580c',
  },
  กำลังซ่อม: {
    card: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    badge: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    button: 'border-yellow-200 bg-yellow-50 text-yellow-900 hover:bg-yellow-100',
    chart: '#ca8a04',
  },
  ซ่อมเสร็จรอส่ง: {
    card: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    button: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    chart: '#059669',
  },
  ปิดงาน: {
    card: 'border-slate-900 bg-slate-950 text-white',
    badge: 'border-slate-900 bg-slate-950 text-white',
    button: 'border-slate-900 bg-slate-950 text-white hover:bg-slate-800',
    chart: '#020617',
  },
  inShop: {
    card: 'border-red-200 bg-red-50 text-red-800',
    chart: '#dc2626',
  },
  all: {
    card: 'border-blue-200 bg-blue-50 text-blue-800',
    chart: '#1d4ed8',
  },
  revenue: {
    card: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    chart: '#047857',
  },
};

const emptyVehicle = {
  id: '',
  invoice_number: '',
  license_plate: '',
  owner_name: '',
  phone: '',
  brand: '',
  model: '',
  color: '',
  vin: '',
  mileage: '',
  status: DEFAULT_STATUS,
  repair_cost: '',
  booking_date: '',
  estimated_completion_date: '',
  status_detail: '',
  receipt_image: '',
};

function money(value) {
  return Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });
}

function dateText(value) {
  if (!value) return '-';
  const parts = String(value).slice(0, 10).split('-');
  if (parts.length !== 3) return value;
  const month = MONTHS_TH[Number(parts[1]) - 1] || parts[1];
  return `${Number(parts[2])} ${month} ${Number(parts[0]) + 543}`;
}

function dateInputValue(date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

function normalizeVehicle(vehicle = {}) {
  return {
    ...emptyVehicle,
    ...vehicle,
    status: STATUS_OPTIONS.includes(vehicle.status) ? vehicle.status : DEFAULT_STATUS,
    repair_cost: vehicle.repair_cost ?? '',
    mileage: vehicle.mileage ?? '',
  };
}

function dateKey(vehicle) {
  return vehicle.booking_date || vehicle.estimated_completion_date || String(vehicle.created_at || '').slice(0, 10);
}

function isFinal(vehicle) {
  return vehicle.status === FINAL_STATUS;
}

function isInShop(vehicle) {
  return vehicle.status !== CLOSED_STATUS;
}

function matchesVehicle(vehicle, text) {
  const query = text.trim().toLowerCase();
  const phoneQuery = query.replace(/[^0-9]/g, '');
  if (!query) return true;
  const phone = String(vehicle.phone || '').replace(/[^0-9]/g, '');
  return [
    vehicle.owner_name,
    vehicle.phone,
    vehicle.license_plate,
    vehicle.invoice_number,
    vehicle.vin,
    vehicle.brand,
    vehicle.model,
  ].some((value) => String(value || '').toLowerCase().includes(query)) || (phoneQuery && phone.includes(phoneQuery));
}

function aggregateByPeriod(vehicles, period, mode) {
  const rows = new Map();
  for (const vehicle of vehicles) {
    const source = dateKey(vehicle);
    const key = period === 'year' ? source.slice(0, 4) : period === 'day' ? source.slice(0, 10) : source.slice(0, 7);
    if (!key) continue;
    const current = rows.get(key) || { label: key, revenue: 0, cars: 0 };
    if (mode === 'revenue' && isFinal(vehicle)) current.revenue += Number(vehicle.repair_cost || 0);
    if (mode === 'in_shop' && isInShop(vehicle)) current.cars += 1;
    rows.set(key, current);
  }
  return Array.from(rows.values()).sort((a, b) => String(a.label).localeCompare(String(b.label)));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Header({ admin = false }) {
  const navLinkClass = 'inline-flex min-h-11 items-center rounded-lg px-3 text-base font-extrabold text-slate-700 hover:bg-slate-100 sm:px-4 sm:text-lg';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-700 text-white">
            <Wrench className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xl font-extrabold leading-tight text-slate-950">JBM Pro Auto</p>
            <p className="text-base font-semibold text-slate-500">ระบบอู่ซ่อมรถ</p>
          </div>
        </Link>
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto sm:gap-2">
          <Link className={navLinkClass} href="/">
            หน้าแรก
          </Link>
          <Link className={navLinkClass} href="/#about">
            เกี่ยวกับร้าน
          </Link>
          <Link className={`${navLinkClass} gap-2`} href="/status">
            <Search className="h-5 w-5" />
            เช็คสถานะ
          </Link>
          <Link className={admin ? 'inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-3 text-base font-extrabold text-white sm:px-4 sm:text-lg' : navLinkClass} href="/admin">
            แอดมิน
          </Link>
        </nav>
      </div>
    </header>
  );
}

function StatusPill({ status }) {
  const theme = STATUS_THEME[status] || STATUS_THEME[DEFAULT_STATUS];
  return <span className={`inline-flex rounded-lg border px-3 py-1.5 text-base font-extrabold ${theme.badge}`}>{status || DEFAULT_STATUS}</span>;
}

function CustomerSearch() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const text = query.trim();
    if (!text) {
      setResult(null);
      setError('กรุณากรอกเลขใบแจ้งหนี้ ทะเบียนรถ ชื่อ เบอร์โทร หรือ VIN');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}?search=${encodeURIComponent(text)}`);
      const rows = await response.json();
      if (!response.ok) throw new Error(rows?.error || 'search failed');
      const vehicle = Array.isArray(rows) && rows[0] ? normalizeVehicle(rows[0]) : null;
      setResult(vehicle);
      setError(vehicle ? '' : 'ไม่พบข้อมูลรถจากคำค้นหานี้');
    } catch {
      setResult(null);
      setError('ระบบค้นหายังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-16 flex-1 rounded-lg border border-slate-300 bg-white px-5 text-xl text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          placeholder="เลขใบแจ้งหนี้ / ทะเบียน / ชื่อ / เบอร์โทร / VIN"
        />
        <button className="inline-flex min-h-16 items-center justify-center gap-2 rounded-lg bg-blue-700 px-7 text-xl font-extrabold text-white hover:bg-blue-800" type="submit">
          <Search className="h-6 w-6" />
          {loading ? 'กำลังค้นหา' : 'ค้นหา'}
        </button>
      </form>
      {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-lg font-bold text-rose-700">{error}</p>}
      {result && (
        <div className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-base font-bold text-slate-500">เลขใบแจ้งหนี้/ใบเสร็จ</p>
              <h2 className="text-3xl font-extrabold text-slate-950">{result.invoice_number || '-'}</h2>
              <p className="text-xl text-slate-700">{result.brand || '-'} {result.model || ''} | {result.license_plate || '-'}</p>
            </div>
            <StatusPill status={result.status} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="ชื่อเจ้าของรถ" value={result.owner_name || '-'} />
            <Info label="เบอร์โทรศัพท์" value={result.phone || '-'} />
            <Info label="สีรถ" value={result.color || '-'} />
            <Info label="VIN / เลขตัวถัง" value={result.vin || '-'} />
            <Info label="เลขไมล์" value={result.mileage ? `${Number(result.mileage).toLocaleString('th-TH')} กม.` : '-'} />
            <Info label="วันที่จอง" value={dateText(result.booking_date)} />
            <Info label="วันที่กำหนดเสร็จ" value={dateText(result.estimated_completion_date)} />
          </div>
          {result.status_detail && <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-lg text-blue-950">{result.status_detail}</div>}
          {result.receipt_image && (
            <a className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 px-4 text-lg font-bold text-blue-700 hover:bg-blue-50" href={result.receipt_image} target="_blank" rel="noopener noreferrer">
              <Upload className="h-5 w-5" />
              เปิดรูปประกอบ
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-base font-bold text-slate-500">{label}</p>
      <p className="text-xl font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function HomePage() {
  const services = [
    ['ตรวจเช็กระบบรถยุโรป', 'อ่านค่าระบบ วางแผนซ่อม และอธิบายงานให้ลูกค้าเข้าใจง่าย', Gauge],
    ['ซ่อมบำรุง', 'ดูแลช่วงล่าง เบรก ของเหลว และงานบำรุงรักษาตามระยะ', Wrench],
    ['วินิจฉัยปัญหา', 'ไล่ปัญหาอย่างเป็นระบบก่อนเริ่มงานซ่อม ลดการเดาและลดเวลารอ', Settings],
    ['ติดตามสถานะงานซ่อม', 'ลูกค้าเช็คสถานะได้ด้วยเลขใบแจ้งหนี้ ทะเบียน เบอร์โทร หรือ VIN', Search],
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Header />
      <main>
        <section
          className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-950"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(15,23,42,.94) 0%, rgba(15,23,42,.76) 48%, rgba(15,23,42,.30) 100%), url('https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1800&q=80')",
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        >
          <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1440px] items-center px-4 py-12 sm:px-6 lg:px-8">
            <div className="max-w-4xl space-y-7 py-10 text-white">
              <p className="inline-flex rounded-lg border border-yellow-300/50 bg-yellow-300/15 px-4 py-2 text-lg font-extrabold text-yellow-200">JBM Pro Auto | European Car Service</p>
              <h1 className="max-w-4xl text-5xl font-extrabold leading-tight sm:text-6xl lg:text-7xl">อู่ซ่อมรถยุโรปพรีเมียม พร้อมระบบติดตามสถานะงานซ่อม</h1>
              <p className="max-w-3xl text-2xl leading-10 text-blue-50">ดูแลงานซ่อม ตรวจเช็ก และติดตามคิวซ่อมได้ชัดเจน ลูกค้าค้นหาสถานะรถด้วยเลขใบแจ้งหนี้ ทะเบียน เบอร์โทร หรือ VIN ได้ทันที</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link className="inline-flex min-h-16 items-center justify-center gap-2 rounded-lg bg-yellow-400 px-7 text-xl font-extrabold text-slate-950 shadow-lg shadow-yellow-950/20 hover:bg-yellow-300" href="/status">
                  <Search className="h-6 w-6" />
                  ตรวจสอบสถานะรถ
                </Link>
              </div>
              <div className="grid max-w-4xl gap-3 pt-5 sm:grid-cols-3">
                <div className="border-l-4 border-yellow-300 pl-4">
                  <p className="text-3xl font-extrabold">616 1B</p>
                  <p className="text-lg font-bold text-blue-100">พัฒนาการ 30</p>
                </div>
                <div className="border-l-4 border-yellow-300 pl-4">
                  <p className="text-3xl font-extrabold">099 265 1133</p>
                  <p className="text-lg font-bold text-blue-100">โทรสอบถามร้าน</p>
                </div>
                <div className="border-l-4 border-yellow-300 pl-4">
                  <p className="text-3xl font-extrabold">9:00-17:30</p>
                  <p className="text-lg font-bold text-blue-100">จันทร์ - เสาร์</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="bg-slate-50 py-10">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
              <div>
                <p className="text-lg font-extrabold text-blue-700">เช็คสถานะออนไลน์</p>
                <h2 className="mt-2 text-4xl font-extrabold leading-tight text-slate-950">ค้นหางานซ่อมได้ทันที ไม่ต้องรอโทรถาม</h2>
                <p className="mt-3 text-xl leading-8 text-slate-600">กรอกบางส่วนของเลขใบแจ้งหนี้ ทะเบียนรถ ชื่อลูกค้า เบอร์โทร หรือ VIN ระบบจะแสดงสถานะล่าสุดให้ลูกค้าอ่านง่ายบนทุกหน้าจอ</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <CustomerSearch />
              </div>
            </div>
          </div>
        </section>
        <section id="about" className="bg-white py-14">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
              <div className="space-y-4">
                <p className="text-lg font-extrabold text-blue-700">เกี่ยวกับร้าน</p>
                <h2 className="text-4xl font-extrabold leading-tight">JBM Pro Auto</h2>
                <p className="text-xl leading-9 text-slate-600">อู่ซ่อมรถที่เน้นงานตรวจเช็ก วินิจฉัย และซ่อมบำรุงอย่างเป็นขั้นตอน พร้อมระบบหลังบ้านสำหรับติดตามคิวและสถานะงานซ่อมให้พนักงานใช้งานง่าย</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <p className="text-2xl font-extrabold text-blue-900">อ่านง่าย</p>
                    <p className="mt-1 text-lg font-bold text-blue-700">ฟอนต์ใหญ่ ปุ่มใหญ่ รองรับพนักงานทุกช่วงวัย</p>
                  </div>
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <p className="text-2xl font-extrabold text-yellow-900">ติดตามชัด</p>
                    <p className="mt-1 text-lg font-bold text-yellow-800">สถานะ สี และข้อมูลรถแสดงครบถ้วน</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map(([title, detail, Icon]) => (
                  <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-700 text-white">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-950">{title}</h3>
                    <p className="mt-2 text-lg leading-7 text-slate-600">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="bg-slate-950 py-14 text-white">
          <div className="mx-auto grid max-w-[1440px] gap-8 px-4 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:px-8">
            <div className="space-y-5">
              <p className="text-lg font-extrabold text-yellow-300">ติดต่อร้าน</p>
              <h2 className="text-4xl font-extrabold">JBM Pro Auto</h2>
              <div className="space-y-4 text-xl leading-8 text-blue-50">
                <p className="flex gap-3"><MapPin className="mt-1 h-6 w-6 shrink-0 text-yellow-300" />616 1B ซอย พัฒนาการ 30 สวนหลวง เขตสวนหลวง กรุงเทพมหานคร 10250</p>
                <p className="flex gap-3"><Phone className="mt-1 h-6 w-6 shrink-0 text-yellow-300" />099 265 1133</p>
                <p className="flex gap-3"><Clock className="mt-1 h-6 w-6 shrink-0 text-yellow-300" />วันจันทร์ - วันเสาร์ 9:00-17:30<br />วันอาทิตย์ ปิดทำการ</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a className="inline-flex min-h-14 items-center gap-2 rounded-lg bg-green-500 px-5 text-lg font-extrabold text-white hover:bg-green-400" href="https://line.me/R/ti/p/@JBMPRO" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5" />
                  LINE @JBMPRO
                </a>
                <a className="inline-flex min-h-14 items-center gap-2 rounded-lg bg-blue-600 px-5 text-lg font-extrabold text-white hover:bg-blue-500" href="https://www.facebook.com/jbmproauto?locale=th_TH" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-5 w-5" />
                  Facebook
                </a>
                <a className="inline-flex min-h-14 items-center gap-2 rounded-lg bg-pink-600 px-5 text-lg font-extrabold text-white hover:bg-pink-500" href="https://www.instagram.com/jbm.pro.auto/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-5 w-5" />
                  Instagram
                </a>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/15 bg-white/10 shadow-2xl">
              <iframe
                className="h-[360px] w-full border-0 sm:h-[430px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=JBM%20Pro%20Auto%20616%201B%20%E0%B8%8B%E0%B8%AD%E0%B8%A2%20%E0%B8%9E%E0%B8%B1%E0%B8%92%E0%B8%99%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%A3%2030%20%E0%B8%AA%E0%B8%A7%E0%B8%99%E0%B8%AB%E0%B8%A5%E0%B8%A7%E0%B8%87%20%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B8%A3&output=embed"
                title="แผนที่ JBM Pro Auto"
              />
              <div className="flex flex-col gap-3 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-lg font-bold text-blue-50">เปิดเส้นทางด้วย Google Maps</p>
                <a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-yellow-400 px-5 text-lg font-extrabold text-slate-950 hover:bg-yellow-300" href="https://maps.app.goo.gl/R3Hh4ZxD7KXkciZt5" target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-5 w-5" />
                  เปิด Google Maps
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatusPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h1 className="text-4xl font-extrabold text-slate-950">ค้นหาสถานะรถ</h1>
          <p className="mt-2 text-xl text-slate-600">สำหรับลูกค้าเท่านั้น ไม่มีข้อมูลรายได้และไม่มีปุ่มแก้ไข</p>
        </div>
        <CustomerSearch />
      </main>
    </div>
  );
}

function AdminApp() {
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [active, setActive] = useState('dashboard');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState('all');
  const [period, setPeriod] = useState('month');
  const [filters, setFilters] = useState({ day: 'all', month: 'all', year: 'all' });
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [uploadingId, setUploadingId] = useState('');
  const [inShopQuery, setInShopQuery] = useState('');

  const headers = useCallback(() => ({ 'x-vehicle-admin-token': token }), [token]);

  const loadVehicles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?admin=1`, { headers: headers() });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'load failed');
      setVehicles((Array.isArray(data) ? data : []).map(normalizeVehicle));
    } finally {
      setLoading(false);
    }
  }, [headers, token]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const login = async (event) => {
    event.preventDefault();
    if (!tokenInput.trim()) {
      setLoginError('กรุณากรอกรหัสพนักงาน');
      return;
    }
    setLoginError('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: tokenInput.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'เข้าสู่ระบบไม่สำเร็จ');
      setToken(tokenInput.trim());
      setTokenInput('');
    } catch (error) {
      setLoginError(error.message || 'รหัสพนักงานไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const saveVehicle = async (vehicle) => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify({ ...vehicle, id: vehicle.id || `job-${Date.now()}` }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'บันทึกข้อมูลไม่สำเร็จ');
    setEditing(null);
    setActive('all');
    await loadVehicles();
    return normalizeVehicle(data.vehicle || vehicle);
  };

  const deleteVehicle = async (id) => {
    if (!window.confirm('ยืนยันการลบข้อมูลรถคันนี้')) return;
    const response = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers() });
    if (!response.ok) throw new Error('ลบข้อมูลไม่สำเร็จ');
    await loadVehicles();
  };

  const updateStatus = async (vehicle, status) => {
    await saveVehicle({ ...vehicle, status });
  };

  const uploadVehicleImage = async (vehicle, file) => {
    if (!file) return;
    setUploadingId(vehicle.id);
    try {
      const receiptImage = await readFileAsDataUrl(file);
      const saved = await saveVehicle({ ...vehicle, receipt_image: receiptImage });
      setSelectedVehicle((current) => (current?.id === vehicle.id ? saved : current));
    } finally {
      setUploadingId('');
    }
  };

  const stats = useMemo(() => {
    const finalRows = vehicles.filter(isFinal);
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const year = today.slice(0, 4);
    const revenueFor = (prefix) => finalRows.filter((vehicle) => dateKey(vehicle).startsWith(prefix)).reduce((sum, vehicle) => sum + Number(vehicle.repair_cost || 0), 0);
    return {
      all: vehicles.length,
      inShop: vehicles.filter(isInShop).length,
      booking: vehicles.filter((vehicle) => vehicle.status === 'จองคิว').length,
      checking: vehicles.filter((vehicle) => vehicle.status === 'กำลังตรวจเช็ค').length,
      parts: vehicles.filter((vehicle) => vehicle.status === 'รออะไหล่').length,
      repairing: vehicles.filter((vehicle) => vehicle.status === 'กำลังซ่อม').length,
      final: finalRows.length,
      closed: vehicles.filter((vehicle) => vehicle.status === CLOSED_STATUS).length,
      todayRevenue: revenueFor(today),
      monthRevenue: revenueFor(month),
      yearRevenue: revenueFor(year),
      totalRevenue: finalRows.reduce((sum, vehicle) => sum + Number(vehicle.repair_cost || 0), 0),
      totalRepairCost: vehicles.reduce((sum, vehicle) => sum + Number(vehicle.repair_cost || 0), 0),
    };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      if (statusFilter === 'inShop' && !isInShop(vehicle)) return false;
      if (statusFilter !== 'all' && statusFilter !== 'inShop' && vehicle.status !== statusFilter) return false;
      const key = dateKey(vehicle);
      if (filters.year !== 'all' && !key.startsWith(filters.year)) return false;
      if (filters.month !== 'all' && key.slice(5, 7) !== filters.month) return false;
      if (filters.day !== 'all' && key.slice(8, 10) !== filters.day) return false;
      return matchesVehicle(vehicle, query);
    });
  }, [filters, query, statusFilter, vehicles]);

  const inShopVehicles = useMemo(() => {
    return vehicles.filter(isInShop).filter((vehicle) => matchesVehicle(vehicle, inShopQuery));
  }, [inShopQuery, vehicles]);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header admin />
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center px-4 py-10 sm:px-6">
          <form onSubmit={login} className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-extrabold text-slate-950">เข้าสู่ระบบแอดมิน</h1>
            <p className="mt-1 text-xl text-slate-600">ป้องกันหลังบ้านสำหรับพนักงาน</p>
            <label className="mt-6 block text-xl font-extrabold text-slate-700" htmlFor="admin-token">รหัสพนักงาน</label>
            <input
              id="admin-token"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              className="mt-2 min-h-16 w-full rounded-lg border border-slate-300 px-5 text-xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              type="password"
            />
            {loginError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-lg font-bold text-rose-700">{loginError}</p>}
            <button className="mt-5 inline-flex min-h-16 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-xl font-extrabold text-white hover:bg-blue-800" type="submit">
              <ShieldCheck className="h-6 w-6" />
              {loading ? 'กำลังตรวจสอบ' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </main>
      </div>
    );
  }

  const nav = [
    ['dashboard', 'Dashboard', Gauge],
    ['form', 'เพิ่มคิว / ลงทะเบียนเคสซ่อม', Plus],
    ['all', 'รถทั้งหมดในระบบ', Car],
    ['in-shop', 'รถค้างในร้าน', Wrench],
    ['revenue', 'สรุปรายได้', Banknote],
    ['charts', 'กราฟ', ClipboardList],
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="lg:flex">
        <aside className={`fixed inset-y-0 left-0 z-40 w-[280px] transform border-r border-slate-200 bg-white transition lg:static lg:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
            <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-blue-700">
              <Wrench className="h-7 w-7" />
              JBM Admin
            </Link>
            <button className="rounded-lg p-2 text-slate-600 lg:hidden" onClick={() => setMobileMenu(false)} type="button" aria-label="ปิดเมนู"><X className="h-7 w-7" /></button>
          </div>
          <nav className="space-y-1 p-3">
            {nav.map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => {
                  setActive(key);
                  setMobileMenu(false);
                  if (key === 'form') setEditing({ ...emptyVehicle });
                }}
                className={`flex min-h-14 w-full items-center gap-3 rounded-lg px-3 text-left text-lg font-extrabold ${active === key ? 'bg-blue-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                type="button"
              >
                <Icon className="h-6 w-6" />
                {label}
              </button>
            ))}
          </nav>
        </aside>
        <main className="min-h-screen flex-1">
          <div className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
            <button className="rounded-lg border border-slate-200 p-2 text-slate-700 lg:hidden" onClick={() => setMobileMenu(true)} type="button" aria-label="เปิดเมนู"><Menu className="h-7 w-7" /></button>
            <div>
              <h1 className="text-3xl font-extrabold">{nav.find(([key]) => key === active)?.[1]}</h1>
            <p className="text-lg text-slate-500">สีสถานะชัดเจน | ปิดงานไม่นับเป็นรถค้างในร้าน</p>
            </div>
            <button className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 px-4 text-lg font-extrabold text-slate-700 hover:bg-slate-50" onClick={() => setToken('')} type="button">
              <Lock className="h-5 w-5" />
              ออก
            </button>
          </div>
          <div className="space-y-6 p-4 sm:p-6">
            {active === 'dashboard' && <Dashboard stats={stats} vehicles={vehicles} statusFilter={dashboardStatusFilter} setStatusFilter={setDashboardStatusFilter} />}
            {active === 'form' && <VehicleForm initial={editing || emptyVehicle} onSave={saveVehicle} onCancel={() => setActive('dashboard')} />}
            {active === 'all' && (
              <VehicleTable
                title="รถทั้งหมดในระบบ"
                vehicles={filteredVehicles}
                allVehicles={vehicles}
                stats={stats}
                filters={filters}
                setFilters={setFilters}
                query={query}
                setQuery={setQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                onAdd={() => { setEditing({ ...emptyVehicle }); setActive('form'); }}
                onEdit={(vehicle) => { setEditing(vehicle); setActive('form'); }}
                onDelete={deleteVehicle}
                onStatus={updateStatus}
                onDetail={setSelectedVehicle}
                onUpload={uploadVehicleImage}
                uploadingId={uploadingId}
              />
            )}
            {active === 'in-shop' && <InShop vehicles={inShopVehicles} query={inShopQuery} setQuery={setInShopQuery} />}
            {active === 'revenue' && <RevenueSummary vehicles={vehicles} />}
            {active === 'charts' && (
              <div className="grid gap-5 xl:grid-cols-2">
                <ChartPanel title="กราฟรายได้จากรถซ่อมเสร็จ" data={aggregateByPeriod(vehicles, period, 'revenue')} period={period} setPeriod={setPeriod} type="revenue" />
                <ChartPanel title="กราฟจำนวนรถค้างในอู่" data={aggregateByPeriod(vehicles, period, 'in_shop')} period={period} setPeriod={setPeriod} type="cars" />
              </div>
            )}
          </div>
        </main>
      </div>
      {selectedVehicle && <VehicleDetailModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />}
    </div>
  );
}

function Dashboard({ stats, vehicles, statusFilter, setStatusFilter }) {
  const filteredVehicles = statusFilter === 'all' ? vehicles : statusFilter === 'inShop' ? vehicles.filter(isInShop) : vehicles.filter((vehicle) => vehicle.status === statusFilter);
  const bookingDays = ['วันนี้', 'พรุ่งนี้', 'มะรืนนี้'].map((label, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const key = dateInputValue(date);
    return {
      label,
      date: key,
      vehicles: vehicles.filter((vehicle) => String(vehicle.booking_date || '').slice(0, 10) === key),
    };
  });

  return (
    <div className="space-y-6">
      <SummaryGrid stats={stats} activeFilter={statusFilter} onFilter={setStatusFilter} />
      <BookingCalendar days={bookingDays} />
      <DashboardVehicleList vehicles={filteredVehicles} statusFilter={statusFilter} />
    </div>
  );
}

function SummaryGrid({ stats, compact = false, activeFilter = '', onFilter }) {
  const dashboardCards = [
    { title: 'รถทั้งหมด', value: `${stats.all} คัน`, icon: <Car />, tone: 'all', filter: 'all' },
    { title: 'รถค้างในร้าน', value: `${stats.inShop} คัน`, icon: <Wrench />, tone: 'inShop', filter: 'inShop' },
    { title: 'จองคิว', value: `${stats.booking} คัน`, icon: <ClipboardList />, tone: 'จองคิว', filter: 'จองคิว' },
    { title: 'กำลังตรวจเช็ค', value: `${stats.checking} คัน`, icon: <Gauge />, tone: 'กำลังตรวจเช็ค', filter: 'กำลังตรวจเช็ค' },
    { title: 'รออะไหล่', value: `${stats.parts} คัน`, icon: <ClipboardList />, tone: 'รออะไหล่', filter: 'รออะไหล่' },
    { title: 'กำลังซ่อม', value: `${stats.repairing} คัน`, icon: <Wrench />, tone: 'กำลังซ่อม', filter: 'กำลังซ่อม' },
    { title: 'ซ่อมเสร็จรอส่ง', value: `${stats.final} คัน`, icon: <CheckCircle2 />, tone: FINAL_STATUS, filter: FINAL_STATUS },
    { title: 'ปิดงาน', value: `${stats.closed} คัน`, icon: <CheckCircle2 />, tone: CLOSED_STATUS, filter: CLOSED_STATUS },
  ];
  const compactCards = [
    ...dashboardCards,
  ];
  const cards = compact ? compactCards : dashboardCards;
  return (
    <div className={`grid gap-4 ${compact ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
      {cards.map((card) => <Metric key={card.title} {...card} active={activeFilter === card.filter} onClick={onFilter && card.filter ? () => onFilter(card.filter) : undefined} />)}
    </div>
  );
}

function Metric({ title, value, icon, tone = 'all', active = false, onClick }) {
  const theme = STATUS_THEME[tone] || STATUS_THEME.all;
  const Component = onClick ? 'button' : 'div';
  return (
    <Component className={`rounded-xl border p-5 text-left shadow-sm transition ${theme.card} ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''} ${active ? 'ring-4 ring-blue-200' : ''}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <div className="mb-3 flex items-center justify-between text-lg font-extrabold">
        <p>{title}</p>
        {React.cloneElement(icon, { className: 'h-7 w-7' })}
      </div>
      <p className="text-4xl font-extrabold">{value}</p>
    </Component>
  );
}

function BookingCalendar({ days }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-extrabold text-slate-950">ปฏิทินจองคิว 3 วัน</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {days.map((day) => (
          <div key={day.date} className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-extrabold text-blue-950">{day.label}</p>
                <p className="text-base font-bold text-blue-700">{dateText(day.date)}</p>
              </div>
              <p className="rounded-lg bg-blue-700 px-3 py-1 text-lg font-extrabold text-white">{day.vehicles.length} คัน</p>
            </div>
            <div className="space-y-2">
              {day.vehicles.map((vehicle) => (
                <div key={vehicle.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-lg font-extrabold text-slate-950">{vehicle.invoice_number || vehicle.brand || '-'}</p>
                  <p className="text-base font-bold text-slate-600">ทะเบียน: {vehicle.license_plate || '-'}</p>
                  <p className="text-base font-bold text-slate-600">ลูกค้า: {vehicle.owner_name || '-'}</p>
                </div>
              ))}
              {day.vehicles.length === 0 && <p className="rounded-lg border border-dashed border-blue-200 bg-white p-4 text-center text-lg font-bold text-slate-500">ไม่มีรถจองวันนี้</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardVehicleList({ vehicles, statusFilter }) {
  const title = statusFilter === 'all' ? 'รายการรถทั้งหมด' : `รายการรถสถานะ ${statusFilter}`;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-2xl font-extrabold text-slate-950">{title}</h2>
        <p className="text-lg font-bold text-slate-500">{vehicles.length} คัน</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[860px] text-left text-lg">
          <thead className="bg-slate-100 text-base font-extrabold text-slate-600">
            <tr>
              <th className="p-4">เลขใบแจ้งหนี้ / รถ</th>
              <th className="p-4">ทะเบียนรถ</th>
              <th className="p-4">ลูกค้า</th>
              <th className="p-4">สถานะ</th>
              <th className="p-4">วันที่จอง</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-slate-50">
                <td className="p-4">
                  <p className="font-extrabold text-slate-950">{vehicle.invoice_number || '-'}</p>
                  <p className="text-base font-bold text-slate-500">{vehicle.brand || '-'} {vehicle.model || ''}</p>
                </td>
                <td className="p-4 font-bold text-slate-700">{vehicle.license_plate || '-'}</td>
                <td className="p-4 font-bold text-slate-700">{vehicle.owner_name || '-'}</td>
                <td className="p-4"><StatusPill status={vehicle.status} /></td>
                <td className="p-4 font-bold text-slate-700">{dateText(vehicle.booking_date)}</td>
              </tr>
            ))}
            {vehicles.length === 0 && <tr><td className="p-8 text-center text-slate-500" colSpan={5}>ไม่พบข้อมูลรถตามตัวกรองนี้</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChartPanel({ title, data, period, setPeriod, type }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-extrabold text-slate-950">{title}</h2>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          {[
            ['day', 'วัน'],
            ['month', 'เดือน'],
            ['year', 'ปี'],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)} className={`min-h-11 rounded-lg px-4 text-lg font-extrabold ${period === key ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-white'}`} type="button">{label}</button>
          ))}
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'revenue' ? (
            <LineChart data={data}>
              <CartesianGrid stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 14 }} />
              <YAxis tick={{ fontSize: 14 }} />
              <Tooltip formatter={(value) => `฿${money(value)}`} />
              <Line type="monotone" dataKey="revenue" stroke={STATUS_THEME.revenue.chart} strokeWidth={3} dot />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 14 }} />
              <YAxis tick={{ fontSize: 14 }} />
              <Tooltip formatter={(value) => `${value} คัน`} />
              <Bar dataKey="cars" fill={STATUS_THEME.inShop.chart} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function VehicleForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => normalizeVehicle(initial));
  const [brandMode, setBrandMode] = useState(BRAND_OPTIONS.includes(initial.brand) && initial.brand !== 'อื่น ๆ' ? 'select' : 'custom');
  const [modelMode, setModelMode] = useState('select');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const next = normalizeVehicle(initial);
    setForm(next);
    setBrandMode(BRAND_OPTIONS.includes(next.brand) && next.brand !== 'อื่น ๆ' ? 'select' : 'custom');
    setModelMode((MODEL_OPTIONS[next.brand] || []).includes(next.model) ? 'select' : 'custom');
  }, [initial]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const modelChoices = MODEL_OPTIONS[form.brand] || [];

  const uploadImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update('receipt_image', String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (saveError) {
      setError(saveError.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-lg font-extrabold text-blue-700">ข้อมูลเคสซ่อม</p>
          <h2 className="text-4xl font-extrabold text-slate-950">เพิ่ม/แก้ไขข้อมูลรถ</h2>
          <p className="mt-1 text-xl text-slate-600">ทุกฟิลด์เว้นว่างได้ ระบบจะตั้งสถานะเริ่มต้นเป็นจองคิว</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-xl font-extrabold text-slate-700 hover:bg-slate-50" onClick={onCancel} type="button"><X className="h-6 w-6" />ยกเลิก</button>
          <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 text-xl font-extrabold text-white shadow-sm hover:bg-blue-800" type="submit"><Save className="h-6 w-6" />{saving ? 'กำลังบันทึก' : 'บันทึก'}</button>
        </div>
      </div>
      {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-lg font-bold text-rose-700">{error}</p>}
      <div className="space-y-5">
        <FormSection title="ข้อมูลลูกค้า">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ชื่อลูกค้า" value={form.owner_name} onChange={(value) => update('owner_name', value)} />
            <Field label="เบอร์โทรศัพท์" value={form.phone} onChange={(value) => update('phone', value)} />
          </div>
        </FormSection>

        <FormSection title="ข้อมูลรถ">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="ทะเบียนรถ" value={form.license_plate} onChange={(value) => update('license_plate', value)} />
            <BrandField form={form} update={update} mode={brandMode} setMode={setBrandMode} />
            <ModelField form={form} update={update} mode={modelMode} setMode={setModelMode} choices={modelChoices} />
            <Field label="สีรถ" value={form.color} onChange={(value) => update('color', value)} />
            <Field label="VIN / เลขตัวถัง" value={form.vin} onChange={(value) => update('vin', value)} />
            <Field label="เลขไมล์" type="number" value={form.mileage} onChange={(value) => update('mileage', value)} />
          </div>
        </FormSection>

        <FormSection title="ข้อมูลงานซ่อม">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="เลขใบแจ้งหนี้/ใบเสร็จ" value={form.invoice_number} onChange={(value) => update('invoice_number', value)} />
            <SelectField label="สถานะรถ" value={form.status} onChange={(value) => update('status', value)} options={STATUS_OPTIONS} />
            <Field label="ค่าซ่อม" type="number" value={form.repair_cost} onChange={(value) => update('repair_cost', value)} />
            <Field label="วันที่จอง" type="date" value={form.booking_date} onChange={(value) => update('booking_date', value)} />
            <Field label="วันที่กำหนดเสร็จ" type="date" value={form.estimated_completion_date} onChange={(value) => update('estimated_completion_date', value)} />
          </div>
          <div className="mt-4">
            <TextArea label="รายละเอียดสถานะ" value={form.status_detail} onChange={(value) => update('status_detail', value)} />
          </div>
        </FormSection>

        <FormSection title="รูปภาพ">
          <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-start">
            <label className="inline-flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 text-xl font-extrabold text-white shadow-sm hover:bg-blue-800">
              <ImagePlus className="h-7 w-7" />
              อัปโหลดรูป
              <input className="hidden" type="file" accept="image/*" onChange={uploadImage} />
            </label>
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              {form.receipt_image ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <img className="h-32 w-full rounded-lg border border-slate-200 bg-white object-contain sm:w-48" src={form.receipt_image} alt="ตัวอย่างรูปที่อัปโหลด" />
                  <a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-lg font-bold text-blue-700 hover:bg-blue-50" href={form.receipt_image} target="_blank" rel="noopener noreferrer">
                    <Upload className="h-5 w-5" />
                    ดูรูป
                  </a>
                </div>
              ) : (
                <p className="text-lg font-bold text-slate-500">ยังไม่มีรูป Preview</p>
              )}
            </div>
          </div>
        </FormSection>
      </div>
    </form>
  );
}

function FormSection({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <h3 className="mb-4 text-2xl font-extrabold text-slate-950">{title}</h3>
      {children}
    </section>
  );
}

function BrandField({ form, update, mode, setMode }) {
  return (
    <div>
      <span className="text-xl font-extrabold text-slate-800">ยี่ห้อรถ</span>
      <div className="mt-2 grid gap-2">
        {mode === 'select' ? (
          <select
            value={BRAND_OPTIONS.includes(form.brand) ? form.brand : 'อื่น ๆ'}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'อื่น ๆ') {
                setMode('custom');
                update('brand', '');
                update('model', '');
              } else {
                update('brand', value);
                update('model', MODEL_OPTIONS[value]?.[0] || '');
              }
            }}
            className="min-h-16 w-full rounded-lg border border-slate-300 bg-white px-5 text-xl text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">เลือกยี่ห้อ</option>
            {BRAND_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : (
          <input value={form.brand || ''} onChange={(event) => update('brand', event.target.value)} className="min-h-16 w-full rounded-lg border border-slate-300 bg-white px-5 text-xl text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="พิมพ์ยี่ห้อเอง" />
        )}
        <button className="min-h-11 justify-self-start rounded-lg border border-slate-200 bg-white px-4 text-lg font-bold text-blue-700 hover:bg-blue-50" type="button" onClick={() => setMode(mode === 'select' ? 'custom' : 'select')}>
          {mode === 'select' ? 'พิมพ์เอง' : 'เลือกจากรายการ'}
        </button>
      </div>
    </div>
  );
}

function ModelField({ form, update, mode, setMode, choices }) {
  const hasChoices = choices.length > 0;
  return (
    <div>
      <span className="text-xl font-extrabold text-slate-800">รุ่นรถ</span>
      <div className="mt-2 grid gap-2">
        {mode === 'select' && hasChoices ? (
          <select value={choices.includes(form.model) ? form.model : ''} onChange={(event) => update('model', event.target.value)} className="min-h-16 w-full rounded-lg border border-slate-300 bg-white px-5 text-xl text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
            <option value="">เลือกรุ่น</option>
            {choices.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : (
          <input value={form.model || ''} onChange={(event) => update('model', event.target.value)} className="min-h-16 w-full rounded-lg border border-slate-300 bg-white px-5 text-xl text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="พิมพ์รุ่นเอง" />
        )}
        <button className="min-h-11 justify-self-start rounded-lg border border-slate-200 bg-white px-4 text-lg font-bold text-blue-700 hover:bg-blue-50" type="button" onClick={() => setMode(mode === 'select' ? 'custom' : 'select')}>
          {mode === 'select' ? 'พิมพ์เอง' : 'เลือกจากรายการ'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-xl font-extrabold text-slate-800">{label}</span>
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-16 w-full rounded-lg border border-slate-300 bg-white px-5 text-xl text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xl font-extrabold text-slate-800">{label}</span>
      <select value={value || DEFAULT_STATUS} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-16 w-full rounded-lg border border-slate-300 bg-white px-5 text-xl text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xl font-extrabold text-slate-800">{label}</span>
      <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-40 w-full rounded-lg border border-slate-300 bg-white px-5 py-4 text-xl text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
    </label>
  );
}

function VehicleTable({
  title,
  vehicles,
  stats,
  filters,
  setFilters,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  onAdd,
  onEdit,
  onDelete,
  onStatus,
  onDetail,
  onUpload,
  uploadingId,
}) {
  return (
    <section className="space-y-5">
      <SummaryGrid stats={stats} compact activeFilter={statusFilter} onFilter={setStatusFilter} />
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-950">{title}</h2>
            <p className="text-lg text-slate-600">ค้นหา กรองสถานะ ดูรายละเอียด และอัปโหลดรูปได้จากตารางนี้</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-12 rounded-lg border border-slate-300 px-3 text-lg" placeholder="ค้นหาชื่อ เบอร์ ทะเบียน เลขใบแจ้งหนี้ VIN" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-12 rounded-lg border border-slate-300 px-3 text-lg">
              <option value="all">ทุกสถานะ</option>
              <option value="inShop">รถค้างในร้าน</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select value={filters.day} onChange={(event) => setFilters({ ...filters, day: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 px-3 text-lg">
              <option value="all">ทุกวัน</option>
              {Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0')).map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
            <select value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 px-3 text-lg">
              <option value="all">ทุกเดือน</option>
              {MONTHS_TH.map((month, index) => <option key={month} value={String(index + 1).padStart(2, '0')}>{month}</option>)}
            </select>
            <select value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 px-3 text-lg">
              <option value="all">ทุกปี</option>
              {REPORT_YEARS.map((year) => <option key={year} value={String(year)}>{year + 543}</option>)}
            </select>
            <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_52%,#facc15_100%)] px-5 text-lg font-extrabold text-white shadow-lg shadow-blue-900/15 transition hover:scale-[1.01] hover:shadow-xl sm:col-span-2 xl:col-span-1" onClick={onAdd} type="button">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-left leading-tight">เพิ่มคิว / ลงทะเบียนเคสซ่อม</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[1320px] text-left text-lg">
            <thead className="bg-slate-100 text-base font-extrabold text-slate-600">
              <tr>
                <th className="p-4">เลขใบแจ้งหนี้ / รถ</th>
                <th className="p-4">ลูกค้า</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4">วันที่</th>
                <th className="p-4 text-right">ค่าซ่อม</th>
                <th className="p-4">รูป</th>
                <th className="p-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {vehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="cursor-pointer transition hover:bg-blue-50/60 focus-within:bg-blue-50"
                  onClick={() => onDetail(vehicle)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onDetail(vehicle);
                    }
                  }}
                  tabIndex={0}
                  title="คลิกเพื่อดูรายละเอียดรถ"
                >
                  <td className="p-4">
                    <p className="font-extrabold text-slate-950">{vehicle.invoice_number || '-'}</p>
                    <p className="text-slate-700">{vehicle.license_plate || '-'} | {vehicle.brand || '-'} {vehicle.model || ''}</p>
                    <p className="font-mono text-base text-slate-500">VIN: {vehicle.vin || '-'}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-slate-950">{vehicle.owner_name || '-'}</p>
                    <p className="text-slate-600">{vehicle.phone || '-'}</p>
                  </td>
                  <td className="p-4">
                    <StatusPill status={vehicle.status} />
                    {vehicle.status !== CLOSED_STATUS && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {STATUS_OPTIONS.map((status, index) => (
                          <button
                            key={status}
                            onClick={(event) => {
                              event.stopPropagation();
                              onStatus(vehicle, status);
                            }}
                            className={`min-h-9 rounded-lg border px-2 text-base font-extrabold ${STATUS_THEME[status].button}`}
                            type="button"
                          >
                            {index + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-slate-700">
                    <p>จอง: {dateText(vehicle.booking_date)}</p>
                    <p>กำหนดเสร็จ: {dateText(vehicle.estimated_completion_date)}</p>
                  </td>
                  <td className="p-4 text-right font-extrabold text-emerald-700">฿{money(vehicle.repair_cost)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {vehicle.receipt_image ? (
                        <>
                          <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-base font-extrabold text-emerald-800 hover:bg-emerald-100" href={vehicle.receipt_image} onClick={(event) => event.stopPropagation()} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-5 w-5" />
                            ดูรูป
                          </a>
                          <img className="h-12 w-16 rounded-lg border border-slate-200 object-cover" src={vehicle.receipt_image} alt="รูปประกอบรถ" />
                        </>
                      ) : (
                        <span className="text-base font-bold text-slate-500">ยังไม่มีรูป</span>
                      )}
                    </div>
                    <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-base font-extrabold text-blue-800 hover:bg-blue-100" onClick={(event) => event.stopPropagation()}>
                      <ImagePlus className="h-5 w-5" />
                      {uploadingId === vehicle.id ? 'กำลังอัปโหลด' : vehicle.receipt_image ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}
                      <input
                        className="hidden"
                        type="file"
                        accept="image/*"
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => onUpload(vehicle, event.target.files?.[0])}
                      />
                    </label>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-base font-extrabold text-slate-700 hover:bg-slate-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDetail(vehicle);
                        }}
                        type="button"
                      >
                        <Eye className="h-5 w-5" />
                        รายละเอียด
                      </button>
                      <button
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-blue-700 hover:bg-blue-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(vehicle);
                        }}
                        type="button"
                        title="แก้ไข"
                      >
                        <Edit3 className="h-5 w-5" />
                      </button>
                      <button
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-rose-700 hover:bg-rose-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(vehicle.id);
                        }}
                        type="button"
                        title="ลบ"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && <tr><td className="p-8 text-center text-slate-500" colSpan={7}>ไม่พบข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function InShop({ vehicles, query, setQuery }) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-lg font-extrabold">รถค้างในร้าน</p>
            <p className="text-4xl font-extrabold">{vehicles.length} คัน</p>
            <p className="mt-1 text-lg font-bold">นับรถทุกคันที่ยังไม่อยู่สถานะ {FINAL_STATUS}</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-14 w-full rounded-lg border border-red-200 bg-white px-4 text-xl text-slate-950 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 lg:max-w-xl"
            placeholder="ค้นหาชื่อ เบอร์ ทะเบียน เลขใบแจ้งหนี้ หรือ VIN"
          />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-slate-500">เลขใบแจ้งหนี้/ใบเสร็จ</p>
                <h3 className="text-2xl font-extrabold text-slate-950">{vehicle.invoice_number || '-'}</h3>
              </div>
              <StatusPill status={vehicle.status} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="ชื่อลูกค้า" value={vehicle.owner_name || '-'} />
              <Info label="เบอร์โทรศัพท์" value={vehicle.phone || '-'} />
              <Info label="ทะเบียนรถ" value={vehicle.license_plate || '-'} />
              <Info label="ยี่ห้อ / รุ่น" value={`${vehicle.brand || '-'} ${vehicle.model || ''}`} />
              <Info label="ค่าซ่อม" value={`฿${money(vehicle.repair_cost)}`} />
              <Info label="วันที่จอง" value={dateText(vehicle.booking_date)} />
              <Info label="วันที่กำหนดเสร็จ" value={dateText(vehicle.estimated_completion_date)} />
              <Info label="VIN / เลขตัวถัง" value={vehicle.vin || '-'} />
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-base font-bold text-slate-500">รายละเอียดสถานะ</p>
              <p className="text-xl font-bold text-slate-950">{vehicle.status_detail || '-'}</p>
            </div>
          </div>
        ))}
        {vehicles.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xl font-bold text-slate-500">ไม่พบรถค้างในร้านตามคำค้นหา</div>}
      </div>
    </section>
  );
}

function RevenueSummary({ vehicles }) {
  const [year, setYear] = useState('all');
  const finalRows = vehicles.filter(isFinal).filter((vehicle) => year === 'all' || dateKey(vehicle).startsWith(year));
  const total = finalRows.reduce((sum, vehicle) => sum + Number(vehicle.repair_cost || 0), 0);
  const rows = aggregateByPeriod(finalRows, 'month', 'revenue');
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-950">สรุปรายได้</h2>
          <p className="text-lg text-slate-600">นับเฉพาะรถสถานะ {FINAL_STATUS}</p>
        </div>
        <select value={year} onChange={(event) => setYear(event.target.value)} className="min-h-12 rounded-lg border border-slate-300 px-3 text-lg">
          <option value="all">ทุกปี</option>
          {REPORT_YEARS.map((item) => <option key={item} value={String(item)}>{item + 543}</option>)}
        </select>
      </div>
      <Metric title="รายได้จากรถซ่อมเสร็จ" value={`฿${money(total)}`} icon={<Banknote />} tone="revenue" />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-left text-lg">
          <thead className="bg-slate-100 text-base font-extrabold text-slate-600"><tr><th className="p-4">เดือน</th><th className="p-4 text-right">รายได้จากรถซ่อมเสร็จ</th></tr></thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => <tr key={row.label}><td className="p-4 font-bold">{row.label}</td><td className="p-4 text-right font-extrabold text-emerald-700">฿{money(row.revenue)}</td></tr>)}
            {rows.length === 0 && <tr><td className="p-8 text-center text-slate-500" colSpan={2}>ยังไม่มีรายได้</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function VehicleDetailModal({ vehicle, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="vehicle-detail-title">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-lg font-bold text-slate-500">รายละเอียดรถ</p>
            <h2 id="vehicle-detail-title" className="text-3xl font-extrabold text-slate-950">{vehicle.invoice_number || '-'}</h2>
            <p className="text-xl text-slate-700">{vehicle.license_plate || '-'} | {vehicle.brand || '-'} {vehicle.model || ''}</p>
          </div>
          <button className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50" onClick={onClose} type="button" aria-label="ปิดรายละเอียด">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="เลขใบแจ้งหนี้/ใบเสร็จ" value={vehicle.invoice_number || '-'} />
          <Info label="ทะเบียนรถ" value={vehicle.license_plate || '-'} />
          <Info label="ชื่อเจ้าของรถ" value={vehicle.owner_name || '-'} />
          <Info label="เบอร์โทรศัพท์" value={vehicle.phone || '-'} />
          <Info label="ยี่ห้อรถ" value={vehicle.brand || '-'} />
          <Info label="รุ่นรถ" value={vehicle.model || '-'} />
          <Info label="สีรถ" value={vehicle.color || '-'} />
          <Info label="VIN / เลขตัวถัง" value={vehicle.vin || '-'} />
          <Info label="เลขไมล์" value={vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString('th-TH')} กม.` : '-'} />
          <Info label="สถานะรถ" value={vehicle.status || '-'} />
          <Info label="ค่าซ่อม" value={`฿${money(vehicle.repair_cost)}`} />
          <Info label="วันที่จอง" value={dateText(vehicle.booking_date)} />
          <Info label="วันที่กำหนดเสร็จ" value={dateText(vehicle.estimated_completion_date)} />
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-base font-bold text-slate-500">รายละเอียดสถานะ</p>
          <p className="text-xl font-bold text-slate-950">{vehicle.status_detail || '-'}</p>
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 text-base font-bold text-slate-500">รูปที่อัปโหลด</p>
          {vehicle.receipt_image ? (
            <div className="space-y-3">
              <img className="max-h-[420px] w-full rounded-xl border border-slate-200 object-contain" src={vehicle.receipt_image} alt="รูปใบเสร็จหรือรูปประกอบรถ" />
              <a className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-blue-700 px-4 text-lg font-extrabold text-white hover:bg-blue-800" href={vehicle.receipt_image} target="_blank" rel="noopener noreferrer">
                <Eye className="h-5 w-5" />
                เปิดดูรูป
              </a>
            </div>
          ) : (
            <p className="text-xl font-bold text-slate-500">ยังไม่มีรูป</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JbmProAutoApp({ mode = 'home' }) {
  if (mode === 'admin') return <AdminApp />;
  if (mode === 'status') return <StatusPage />;
  return <HomePage />;
}
