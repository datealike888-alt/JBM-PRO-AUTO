'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
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
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit3,
  FileText,
  Gauge,
  Home,
  ImagePlus,
  Lock,
  Menu,
  MapPin,
  Phone,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Upload,
  Wrench,
  X,
} from 'lucide-react';

const API_URL = '/api/vehicles';
const FINAL_STATUS = 'เสร็จรอส่ง';
const BOOKING_STATUS = 'จองคิว';
const STATUS_OPTIONS = [
  'จองคิว',
  'กำลังตรวจเช็ค',
  'รออะไหล่',
  'กำลังซ่อม',
  'ซ่อมเสร็จรอส่ง',
  FINAL_STATUS,
];
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
const BRAND_OPTIONS = ['Mercedes-Benz', 'BMW', 'Audi', 'Volvo', 'Porsche', 'MINI', 'Toyota', 'Honda', 'อื่นๆ'];

const emptyVehicle = {
  id: '',
  invoice_number: '',
  license_plate: '',
  owner_name: '',
  phone: '',
  brand: 'Mercedes-Benz',
  model: '',
  color: '',
  vin: '',
  mileage: '',
  status: BOOKING_STATUS,
  status_note: '',
  repair_cost: '',
  appointment_date: '',
  received_date: '',
  due_date: '',
  delivered_date: '',
  note: '',
  image_path: '',
  image_name: '',
  logs: [],
};

function money(value) {
  return Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });
}

function dateText(value) {
  if (!value) return '-';
  const parts = String(value).slice(0, 10).split('-');
  if (parts.length !== 3) return value;
  const year = Number(parts[0]) + 543;
  const month = MONTHS_TH[Number(parts[1]) - 1] || parts[1];
  return `${Number(parts[2])} ${month} ${year}`;
}

function normalizeVehicle(vehicle = {}) {
  return {
    ...emptyVehicle,
    ...vehicle,
    invoice_number: vehicle.invoice_number || vehicle.receiptNo || '',
    license_plate: vehicle.license_plate || vehicle.plateNo || '',
    owner_name: vehicle.owner_name || vehicle.ownerName || '',
    status_note: vehicle.status_note || vehicle.statusText || '',
    repair_cost: vehicle.repair_cost ?? vehicle.cost ?? '',
    appointment_date: vehicle.appointment_date || vehicle.entryDate || '',
    received_date: vehicle.received_date || vehicle.entryDate || '',
    due_date: vehicle.due_date || vehicle.estimatedCompletion || '',
    image_path: vehicle.image_path || vehicle.receiptUrl || '',
    image_name: vehicle.image_name || vehicle.receiptName || '',
    logs: Array.isArray(vehicle.logs) ? vehicle.logs : [],
  };
}

function isInShop(vehicle) {
  return ![BOOKING_STATUS, FINAL_STATUS].includes(vehicle.status);
}

function isFinal(vehicle) {
  return vehicle.status === FINAL_STATUS;
}

function dateKey(vehicle) {
  return vehicle.delivered_date || vehicle.received_date || vehicle.appointment_date || '';
}

function aggregateByPeriod(vehicles, period, mode) {
  const rows = new Map();
  for (const vehicle of vehicles) {
    const keySource = dateKey(vehicle);
    const key = period === 'year' ? keySource.slice(0, 4) : period === 'month' ? keySource.slice(0, 7) : keySource.slice(0, 10);
    if (!key) continue;
    const current = rows.get(key) || { label: key, revenue: 0, cars: 0 };
    if (mode === 'revenue' && isFinal(vehicle)) current.revenue += Number(vehicle.repair_cost || 0);
    if (mode === 'in_shop' && isInShop(vehicle)) current.cars += 1;
    rows.set(key, current);
  }
  return Array.from(rows.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function metricClass(tone = 'blue') {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    red: 'border-rose-100 bg-rose-50 text-rose-700',
    gray: 'border-slate-200 bg-white text-slate-700',
  };
  return tones[tone] || tones.blue;
}

function StatusPill({ status }) {
  const styles = {
    จองคิว: 'bg-sky-50 text-sky-700 border-sky-200',
    กำลังตรวจเช็ค: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    รออะไหล่: 'bg-amber-50 text-amber-700 border-amber-200',
    กำลังซ่อม: 'bg-violet-50 text-violet-700 border-violet-200',
    ซ่อมเสร็จรอส่ง: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    เสร็จรอส่ง: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return <span className={`inline-flex rounded-md border px-2.5 py-1 text-sm font-semibold ${styles[status] || styles[BOOKING_STATUS]}`}>{status}</span>;
}

function AppHeader({ admin = false }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-700 text-white">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight text-slate-950">JBM Pro Auto</p>
            <p className="text-sm font-medium text-slate-500">ระบบอู่ซ่อมรถ</p>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 px-3 text-base font-semibold text-slate-700 hover:bg-slate-50" href="/status">
            <Search className="h-5 w-5" />
            <span className="hidden sm:inline">เช็คสถานะ</span>
          </Link>
          <Link className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-base font-semibold ${admin ? 'bg-blue-700 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`} href="/admin">
            <ShieldCheck className="h-5 w-5" />
            <span className="hidden sm:inline">แอดมิน</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function CustomerSearch({ initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event?.preventDefault();
    const text = query.trim();
    if (!text) {
      setError('กรุณากรอกชื่อ เบอร์โทร เลขใบแจ้งหนี้/ใบเสร็จ หรือทะเบียนรถ');
      setResult(null);
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
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-14 w-full rounded-md border border-slate-300 bg-white pl-12 pr-4 text-lg text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            placeholder="ชื่อ / เบอร์โทร / เลขใบแจ้งหนี้ / ทะเบียนรถ"
          />
        </div>
        <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-blue-700 px-6 text-lg font-bold text-white hover:bg-blue-800" type="submit">
          <Search className="h-5 w-5" />
          {loading ? 'กำลังค้นหา' : 'ค้นหา'}
        </button>
      </form>

      {error && <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-base font-semibold text-rose-700">{error}</p>}

      {result && (
        <div className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">เลขใบแจ้งหนี้/ใบเสร็จ</p>
              <h2 className="text-2xl font-bold text-slate-950">{result.invoice_number}</h2>
              <p className="text-lg text-slate-700">{result.brand} {result.model} | {result.license_plate}</p>
            </div>
            <StatusPill status={result.status} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoLine label="ชื่อเจ้าของรถ" value={result.owner_name || '-'} />
            <InfoLine label="เบอร์โทร" value={result.phone || '-'} />
            <InfoLine label="สีรถ" value={result.color || '-'} />
            <InfoLine label="เลขไมล์" value={result.mileage ? `${Number(result.mileage).toLocaleString('th-TH')} กม.` : '-'} />
            <InfoLine label="วันที่จอง" value={dateText(result.appointment_date)} />
            <InfoLine label="วันที่รับรถ" value={dateText(result.received_date)} />
            <InfoLine label="กำหนดเสร็จ" value={dateText(result.due_date)} />
            <InfoLine label="VIN" value={result.vin || '-'} />
          </div>
          {result.status_note && (
            <div className="rounded-md border border-blue-100 bg-blue-50 p-4 text-base text-blue-950">
              {result.status_note}
            </div>
          )}
          {result.image_path && (
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 px-4 text-base font-semibold text-blue-700 hover:bg-blue-50" href={result.image_path} target="_blank" rel="noopener noreferrer">
              <FileText className="h-5 w-5" />
              เปิดรูปภาพ/เอกสาร
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function CustomerHome() {
  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <main>
        <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)]">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:py-14">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-base font-semibold text-blue-700">
                <Wrench className="h-5 w-5" />
                อู่ซ่อมรถยุโรปและระบบติดตามงานซ่อม
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl">JBM Pro Auto</h1>
                <p className="max-w-2xl text-xl leading-8 text-slate-700">
                  ตรวจสถานะรถ คิวซ่อม และข้อมูลติดต่อร้านได้จากหน้าเดียว ออกแบบให้ลูกค้าอ่านง่ายทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className="inline-flex min-h-12 items-center gap-2 rounded-md bg-blue-700 px-5 text-lg font-bold text-white hover:bg-blue-800" href="/status">
                  <Search className="h-5 w-5" />
                  ตรวจสอบสถานะรถ
                </Link>
                <Link className="inline-flex min-h-12 items-center gap-2 rounded-md border border-slate-300 px-5 text-lg font-bold text-slate-800 hover:bg-slate-50" href="/admin">
                  <Lock className="h-5 w-5" />
                  เข้าหลังบ้าน
                </Link>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">ที่ตั้งร้าน</h2>
                  <p className="text-base text-slate-600">616/1 ซอยพัฒนาการ 30 กรุงเทพฯ 10250</p>
                </div>
              </div>
              <iframe
                title="JBM Pro Auto map"
                className="h-64 w-full rounded-md border border-slate-200"
                src="https://www.google.com/maps?q=616%2F1+Soi+Phatthanakan+30+Bangkok+10250&output=embed"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </section>
        <CustomerSearch />
        <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 pb-12 sm:px-6 md:grid-cols-3">
          <ContactTile icon={<Phone className="h-6 w-6" />} title="โทรศัพท์" body="099 265 1133" />
          <ContactTile icon={<Home className="h-6 w-6" />} title="บริการหลัก" body="ตรวจเช็ค ซ่อมบำรุง รับคิว และติดตามงานซ่อม" />
          <ContactTile icon={<Clock className="h-6 w-6" />} title="สถานะรถ" body="ค้นหาด้วยชื่อ เบอร์โทร เลขใบแจ้งหนี้ หรือทะเบียนรถ" />
        </section>
      </main>
    </div>
  );
}

function ContactTile({ icon, title, body }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-blue-700">{icon}</div>
      <h3 className="text-xl font-bold text-slate-950">{title}</h3>
      <p className="mt-1 text-base text-slate-600">{body}</p>
    </div>
  );
}

function StatusPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h1 className="text-3xl font-extrabold text-slate-950">ค้นหาสถานะรถ</h1>
          <p className="mt-2 text-lg text-slate-600">หน้าสำหรับลูกค้าเท่านั้น ไม่มีปุ่มแก้ไข ลบ อัปโหลดรูป หรือข้อมูลรายได้</p>
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
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState('dashboard');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [period, setPeriod] = useState('month');
  const [filters, setFilters] = useState({ day: 'all', month: 'all', year: 'all' });

  const adminHeaders = useCallback(() => ({ 'x-vehicle-admin-token': token }), [token]);

  const loadVehicles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?admin=1`, { headers: adminHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'load failed');
      setVehicles((Array.isArray(data) ? data : []).map(normalizeVehicle));
    } finally {
      setLoading(false);
    }
  }, [adminHeaders, token]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const login = async (event) => {
    event.preventDefault();
    const code = tokenInput.trim();
    if (!code) {
      setLoginError('กรุณากรอกรหัสพนักงาน');
      return;
    }
    setLoginError('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'เข้าสู่ระบบไม่สำเร็จ');
      setToken(code);
      setTokenInput('');
    } catch (error) {
      setLoginError(error.message || 'รหัสพนักงานไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const saveVehicle = async (vehicle) => {
    const now = new Date().toLocaleString('th-TH');
    const next = {
      ...vehicle,
      logs: [
        { date: now, text: vehicle.id ? 'บันทึก/แก้ไขข้อมูลรถ' : 'เพิ่มข้อมูลรถใหม่' },
        ...(vehicle.logs || []),
      ],
    };
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify(next),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'บันทึกข้อมูลไม่สำเร็จ');
    setEditing(null);
    await loadVehicles();
  };

  const deleteVehicle = async (id) => {
    if (!window.confirm('ยืนยันการลบข้อมูลรถคันนี้')) return;
    const response = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    });
    if (!response.ok) throw new Error('ลบข้อมูลไม่สำเร็จ');
    await loadVehicles();
  };

  const updateStatus = async (vehicle, status) => {
    await saveVehicle({
      ...vehicle,
      status,
      delivered_date: status === FINAL_STATUS ? new Date().toISOString().slice(0, 10) : vehicle.delivered_date,
    });
  };

  const stats = useMemo(() => {
    const finalRows = vehicles.filter(isFinal);
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const year = today.slice(0, 4);
    const revenueFor = (prefix) => finalRows
      .filter((vehicle) => dateKey(vehicle).startsWith(prefix))
      .reduce((sum, vehicle) => sum + Number(vehicle.repair_cost || 0), 0);
    return {
      all: vehicles.length,
      booking: vehicles.filter((vehicle) => vehicle.status === BOOKING_STATUS).length,
      checking: vehicles.filter((vehicle) => vehicle.status === 'กำลังตรวจเช็ค').length,
      repairing: vehicles.filter((vehicle) => vehicle.status === 'กำลังซ่อม').length,
      inShop: vehicles.filter(isInShop).length,
      ready: vehicles.filter((vehicle) => vehicle.status === FINAL_STATUS).length,
      todayRevenue: revenueFor(today),
      monthRevenue: revenueFor(month),
      yearRevenue: revenueFor(year),
    };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const text = query.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      if (statusFilter !== 'all' && vehicle.status !== statusFilter) return false;
      if (filters.year !== 'all' && !dateKey(vehicle).startsWith(filters.year)) return false;
      if (filters.month !== 'all' && dateKey(vehicle).slice(5, 7) !== filters.month) return false;
      if (filters.day !== 'all' && dateKey(vehicle).slice(8, 10) !== filters.day) return false;
      if (!text) return true;
      const phone = String(vehicle.phone || '').replace(/[^0-9]/g, '');
      const textPhone = text.replace(/[^0-9]/g, '');
      return [
        vehicle.invoice_number,
        vehicle.license_plate,
        vehicle.owner_name,
        vehicle.brand,
        vehicle.model,
        vehicle.vin,
      ].some((value) => String(value || '').toLowerCase().includes(text)) || (textPhone && phone.includes(textPhone));
    });
  }, [filters, query, statusFilter, vehicles]);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader admin />
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center px-4 py-10 sm:px-6">
          <form onSubmit={login} className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-950">เข้าสู่ระบบแอดมิน</h1>
                <p className="text-base text-slate-600">ป้องกันไม่ให้ลูกค้าทั่วไปเข้าถึงหลังบ้าน</p>
              </div>
            </div>
            <label className="text-base font-bold text-slate-700" htmlFor="admin-token">รหัสพนักงาน</label>
            <input
              id="admin-token"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              className="mt-2 min-h-13 w-full rounded-md border border-slate-300 px-4 text-lg outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              type="password"
            />
            {loginError && <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-base font-semibold text-rose-700">{loginError}</p>}
            <button className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-5 text-lg font-bold text-white hover:bg-blue-800" type="submit">
              <ShieldCheck className="h-5 w-5" />
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
    ['revenue-chart', 'กราฟรายได้', TrendingUp],
    ['shop-chart', 'กราฟจำนวนรถในอู่', BarChartIcon],
    ['settings', 'จัดการข้อมูล / ตั้งค่า', Settings],
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="lg:flex">
        <aside className={`fixed inset-y-0 left-0 z-40 w-[260px] transform border-r border-slate-200 bg-white transition lg:static lg:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
            <Link href="/" className="flex items-center gap-2 font-extrabold text-blue-700">
              <Wrench className="h-6 w-6" />
              JBM Admin
            </Link>
            <button className="rounded-md p-2 text-slate-600 lg:hidden" onClick={() => setMobileMenu(false)} type="button">
              <X className="h-6 w-6" />
            </button>
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
                className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-base font-bold ${active === key ? 'bg-blue-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                type="button"
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-h-screen flex-1">
          <div className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
            <button className="rounded-md border border-slate-200 p-2 text-slate-700 lg:hidden" onClick={() => setMobileMenu(true)} type="button">
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold">{nav.find(([key]) => key === active)?.[1]}</h1>
              <p className="text-base text-slate-500">ข้อมูลอัปเดตจาก API และฐานข้อมูล</p>
            </div>
            <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 px-3 text-base font-bold text-slate-700 hover:bg-slate-50" onClick={() => setToken('')} type="button">
              <Lock className="h-5 w-5" />
              ออก
            </button>
          </div>

          <div className="space-y-6 p-4 sm:p-6">
            {active === 'dashboard' && <Dashboard stats={stats} vehicles={vehicles} period={period} setPeriod={setPeriod} />}
            {active === 'form' && <VehicleForm initial={editing || emptyVehicle} onSave={saveVehicle} onCancel={() => setActive('dashboard')} />}
            {active === 'all' && (
              <VehicleTable
                title="รถทั้งหมดในระบบ"
                vehicles={filteredVehicles}
                filters={filters}
                setFilters={setFilters}
                query={query}
                setQuery={setQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                onEdit={(vehicle) => { setEditing(vehicle); setActive('form'); }}
                onDelete={deleteVehicle}
                onStatus={updateStatus}
              />
            )}
            {active === 'in-shop' && <InShop vehicles={vehicles.filter(isInShop)} />}
            {active === 'revenue' && <RevenueSummary vehicles={vehicles} />}
            {active === 'revenue-chart' && <ChartPanel title="กราฟสรุปรายได้" data={aggregateByPeriod(vehicles, period, 'revenue')} period={period} setPeriod={setPeriod} type="revenue" />}
            {active === 'shop-chart' && <ChartPanel title="กราฟจำนวนรถในอู่" data={aggregateByPeriod(vehicles, period, 'in_shop')} period={period} setPeriod={setPeriod} type="cars" />}
            {active === 'settings' && <SettingsPanel reload={loadVehicles} loading={loading} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function BarChartIcon(props) {
  return <TrendingUp {...props} />;
}

function Dashboard({ stats, vehicles, period, setPeriod }) {
  const revenueData = aggregateByPeriod(vehicles, period, 'revenue');
  const shopData = aggregateByPeriod(vehicles, period, 'in_shop');
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="รถทั้งหมด" value={`${stats.all} คัน`} icon={<Car className="h-6 w-6" />} />
        <Metric title="สถานะจองคิว" value={`${stats.booking} คัน`} icon={<CalendarDays className="h-6 w-6" />} />
        <Metric title="กำลังซ่อม" value={`${stats.repairing} คัน`} icon={<Wrench className="h-6 w-6" />} />
        <Metric title="รถค้างในร้าน" value={`${stats.inShop} คัน`} icon={<Clock className="h-6 w-6" />} tone="red" />
        <Metric title="เสร็จรอส่ง" value={`${stats.ready} คัน`} icon={<CheckCircle2 className="h-6 w-6" />} tone="green" />
        <Metric title="รายได้วันนี้" value={`฿${money(stats.todayRevenue)}`} icon={<Banknote className="h-6 w-6" />} tone="green" />
        <Metric title="รายได้เดือนนี้" value={`฿${money(stats.monthRevenue)}`} icon={<TrendingUp className="h-6 w-6" />} tone="green" />
        <Metric title="รายได้ปีนี้" value={`฿${money(stats.yearRevenue)}`} icon={<ClipboardList className="h-6 w-6" />} tone="green" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="รายได้จากรถสถานะเสร็จรอส่ง" data={revenueData} period={period} setPeriod={setPeriod} type="revenue" />
        <ChartPanel title="จำนวนรถค้างในอู่" data={shopData} period={period} setPeriod={setPeriod} type="cars" />
      </div>
    </>
  );
}

function Metric({ title, value, icon, tone = 'blue' }) {
  return (
    <div className={`rounded-lg border p-5 shadow-sm ${metricClass(tone)}`}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-base font-bold">{title}</p>
        {icon}
      </div>
      <p className="text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function ChartPanel({ title, data, period, setPeriod, type }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
        <Segmented value={period} onChange={setPeriod} options={[['day', 'วัน'], ['month', 'เดือน'], ['year', 'ปี']]} />
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'revenue' ? (
            <LineChart data={data}>
              <CartesianGrid stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `฿${money(value)}`} />
              <Line type="monotone" dataKey="revenue" stroke="#1d4ed8" strokeWidth={3} dot />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${value} คัน`} />
              <Bar dataKey="cars" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
      {options.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`min-h-10 rounded-md px-4 text-base font-bold ${value === key ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-white'}`}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function VehicleForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => normalizeVehicle(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(normalizeVehicle(initial));
  }, [initial]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const uploadImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        image_name: file.name,
        image_path: String(reader.result || ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        id: form.id || `job-${Date.now()}`,
      });
    } catch (saveError) {
      setError(saveError.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950">เพิ่มคิว / ลงทะเบียนเคสซ่อม</h2>
          <p className="text-base text-slate-600">เลขใบแจ้งหนี้ให้กรอกเอง และชื่อเจ้าของรถกับเบอร์โทรไม่บังคับ</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 px-4 text-base font-bold text-slate-700 hover:bg-slate-50" onClick={onCancel} type="button">
            <X className="h-5 w-5" />
            ยกเลิก
          </button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-blue-700 px-4 text-base font-bold text-white hover:bg-blue-800" type="submit">
            <Save className="h-5 w-5" />
            {saving ? 'กำลังบันทึก' : 'บันทึก'}
          </button>
        </div>
      </div>
      {error && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-base font-semibold text-rose-700">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="เลขใบแจ้งหนี้/ใบเสร็จ" value={form.invoice_number} onChange={(value) => update('invoice_number', value)} required />
        <Field label="ทะเบียนรถ" value={form.license_plate} onChange={(value) => update('license_plate', value)} required />
        <Field label="ชื่อเจ้าของรถ" value={form.owner_name} onChange={(value) => update('owner_name', value)} />
        <Field label="เบอร์โทรศัพท์" value={form.phone} onChange={(value) => update('phone', value)} />
        <SelectField label="ยี่ห้อรถ" value={form.brand} onChange={(value) => update('brand', value)} options={BRAND_OPTIONS} />
        <Field label="รุ่นรถ" value={form.model} onChange={(value) => update('model', value)} required />
        <Field label="สีรถ" value={form.color} onChange={(value) => update('color', value)} />
        <Field label="VIN / เลขตัวถัง" value={form.vin} onChange={(value) => update('vin', value)} />
        <Field label="เลขไมล์" type="number" value={form.mileage} onChange={(value) => update('mileage', value)} />
        <SelectField label="สถานะรถ" value={form.status} onChange={(value) => update('status', value)} options={STATUS_OPTIONS} />
        <Field label="ค่าซ่อม" type="number" value={form.repair_cost} onChange={(value) => update('repair_cost', value)} />
        <Field label="วันที่จอง" type="date" value={form.appointment_date} onChange={(value) => update('appointment_date', value)} />
        <Field label="วันที่รับรถ" type="date" value={form.received_date} onChange={(value) => update('received_date', value)} />
        <Field label="วันที่กำหนดเสร็จ" type="date" value={form.due_date} onChange={(value) => update('due_date', value)} />
        <Field label="วันที่ส่งมอบ" type="date" value={form.delivered_date} onChange={(value) => update('delivered_date', value)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TextArea label="รายละเอียดสถานะ" value={form.status_note} onChange={(value) => update('status_note', value)} />
        <TextArea label="หมายเหตุ" value={form.note} onChange={(value) => update('note', value)} />
      </div>
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
        <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-md bg-blue-700 px-4 text-base font-bold text-white hover:bg-blue-800">
          <ImagePlus className="h-5 w-5" />
          อัปโหลดรูป
          <input className="hidden" type="file" accept="image/*" onChange={uploadImage} />
        </label>
        {form.image_name && <span className="ml-3 text-base font-semibold text-slate-700">{form.image_name}</span>}
      </div>
    </form>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label className="block">
      <span className="text-base font-bold text-slate-700">{label}{required ? ' *' : ''}</span>
      <input
        required={required}
        type={type}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-lg text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-base font-bold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-lg text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-base font-bold text-slate-700">{label}</span>
      <textarea
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-32 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-lg text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function VehicleTable({ title, vehicles, filters, setFilters, query, setQuery, statusFilter, setStatusFilter, onEdit, onDelete, onStatus }) {
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950">{title}</h2>
          <p className="text-base text-slate-600">ตารางเลื่อนซ้ายขวาได้บนจอเล็ก</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3 text-base" placeholder="ค้นหา" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3 text-base">
            <option value="all">ทุกสถานะ</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select value={filters.day} onChange={(event) => setFilters({ ...filters, day: event.target.value })} className="min-h-11 rounded-md border border-slate-300 px-3 text-base">
            <option value="all">ทุกวัน</option>
            {Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0')).map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
          <select value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} className="min-h-11 rounded-md border border-slate-300 px-3 text-base">
            <option value="all">ทุกเดือน</option>
            {MONTHS_TH.map((month, index) => <option key={month} value={String(index + 1).padStart(2, '0')}>{month}</option>)}
          </select>
          <select value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} className="min-h-11 rounded-md border border-slate-300 px-3 text-base">
            <option value="all">ทุกปี</option>
            {REPORT_YEARS.map((year) => <option key={year} value={String(year)}>{year + 543}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[1180px] text-left text-base">
          <thead className="bg-slate-100 text-sm font-bold text-slate-600">
            <tr>
              <th className="p-3">เลขใบแจ้งหนี้ / รถ</th>
              <th className="p-3">ลูกค้า</th>
              <th className="p-3">สถานะ</th>
              <th className="p-3">วันที่</th>
              <th className="p-3 text-right">ค่าซ่อม</th>
              <th className="p-3">VIN / หมายเหตุ</th>
              <th className="p-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-slate-50">
                <td className="p-3">
                  <p className="font-extrabold text-slate-950">{vehicle.invoice_number}</p>
                  <p className="text-slate-700">{vehicle.license_plate} | {vehicle.brand} {vehicle.model} | {vehicle.color || '-'}</p>
                </td>
                <td className="p-3">
                  <p className="font-bold text-slate-950">{vehicle.owner_name || '-'}</p>
                  <p className="text-slate-600">{vehicle.phone || '-'}</p>
                </td>
                <td className="p-3">
                  <StatusPill status={vehicle.status} />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {STATUS_OPTIONS.map((status) => (
                      <button key={status} onClick={() => onStatus(vehicle, status)} className="min-h-8 rounded-md border border-slate-200 px-2 text-sm font-bold text-slate-600 hover:bg-blue-50" type="button">
                        {STATUS_OPTIONS.indexOf(status) + 1}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-slate-700">
                  <p>จอง: {dateText(vehicle.appointment_date)}</p>
                  <p>รับ: {dateText(vehicle.received_date)}</p>
                  <p>เสร็จ: {dateText(vehicle.due_date)}</p>
                </td>
                <td className="p-3 text-right font-extrabold text-emerald-700">฿{money(vehicle.repair_cost)}</td>
                <td className="p-3">
                  <p className="font-mono text-sm text-slate-600">{vehicle.vin || '-'}</p>
                  <p className="text-slate-700">{vehicle.note || vehicle.status_note || '-'}</p>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    {vehicle.image_path && (
                      <a className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-blue-700 hover:bg-blue-50" href={vehicle.image_path} target="_blank" rel="noopener noreferrer" title="ดูรูป">
                        <Upload className="h-5 w-5" />
                      </a>
                    )}
                    <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-blue-700 hover:bg-blue-50" onClick={() => onEdit(vehicle)} type="button" title="แก้ไข">
                      <Edit3 className="h-5 w-5" />
                    </button>
                    <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-rose-700 hover:bg-rose-50" onClick={() => onDelete(vehicle.id)} type="button" title="ลบ">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td className="p-8 text-center text-slate-500" colSpan={7}>ไม่พบข้อมูล</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InShop({ vehicles }) {
  return (
    <section className="space-y-4">
      <Metric title="จำนวนรถค้างในร้านทั้งหมด" value={`${vehicles.length} คัน`} icon={<Wrench className="h-6 w-6" />} tone="red" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">{vehicle.invoice_number}</p>
                <h3 className="text-xl font-extrabold text-slate-950">{vehicle.license_plate}</h3>
              </div>
              <StatusPill status={vehicle.status} />
            </div>
            <p className="text-lg text-slate-700">{vehicle.brand} {vehicle.model} | {vehicle.color || '-'}</p>
            <div className="mt-3 space-y-1 text-base text-slate-600">
              <p>วันที่รับรถ: {dateText(vehicle.received_date)}</p>
              <p>กำหนดเสร็จ: {dateText(vehicle.due_date)}</p>
              <p>หมายเหตุ: {vehicle.note || vehicle.status_note || '-'}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RevenueSummary({ vehicles }) {
  const [year, setYear] = useState('all');
  const finalRows = vehicles.filter(isFinal).filter((vehicle) => year === 'all' || dateKey(vehicle).startsWith(year));
  const dayRows = aggregateByPeriod(finalRows, 'day', 'revenue');
  const monthRows = aggregateByPeriod(finalRows, 'month', 'revenue');
  const yearRows = aggregateByPeriod(finalRows, 'year', 'revenue');
  const total = finalRows.reduce((sum, vehicle) => sum + Number(vehicle.repair_cost || 0), 0);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950">สรุปรายได้</h2>
          <p className="text-base text-slate-600">นับเฉพาะรถที่มีสถานะเสร็จรอส่งเท่านั้น</p>
        </div>
        <select value={year} onChange={(event) => setYear(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3 text-base">
          <option value="all">ทุกปี</option>
          {REPORT_YEARS.map((item) => <option key={item} value={String(item)}>{item + 543}</option>)}
        </select>
      </div>
      <Metric title="รายได้รวม" value={`฿${money(total)}`} icon={<Banknote className="h-6 w-6" />} tone="green" />
      <RevenueTable title="รายวัน" rows={dayRows} />
      <RevenueTable title="รายเดือน" rows={monthRows} />
      <RevenueTable title="รายปี พ.ศ. 2568 ถึง 2579" rows={yearRows} />
    </section>
  );
}

function RevenueTable({ title, rows }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-xl font-extrabold text-slate-950">{title}</h3>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[560px] text-left text-base">
          <thead className="bg-slate-100 text-sm font-bold text-slate-600">
            <tr>
              <th className="p-3">ช่วงเวลา</th>
              <th className="p-3 text-right">รายได้</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="p-3 font-bold">{row.label}</td>
                <td className="p-3 text-right font-extrabold text-emerald-700">฿{money(row.revenue)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-6 text-center text-slate-500" colSpan={2}>ยังไม่มีรายได้ในเงื่อนไขนี้</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPanel({ reload, loading }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-extrabold text-slate-950">จัดการข้อมูล / ตั้งค่า</h2>
      <p className="mt-2 text-base text-slate-600">ฐานข้อมูลรองรับ phpMyAdmin และมี migration SQL ในโฟลเดอร์ db สำหรับปรับ schema</p>
      <button className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-blue-700 px-4 text-base font-bold text-white hover:bg-blue-800" onClick={reload} type="button">
        <Upload className="h-5 w-5" />
        {loading ? 'กำลังโหลด' : 'โหลดข้อมูลใหม่'}
      </button>
    </section>
  );
}

export default function JbmProAutoApp({ mode = 'home' }) {
  if (mode === 'admin') return <AdminApp />;
  if (mode === 'status') return <StatusPage />;
  return <CustomerHome />;
}
