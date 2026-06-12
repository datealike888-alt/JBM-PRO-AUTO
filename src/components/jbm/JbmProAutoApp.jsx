'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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
  Clock,
  ClipboardList,
  Coins,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  Gauge,
  ImagePlus,
  Lock,
  Menu,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';

const API_URL = '/api/vehicles';
const FINANCIAL_API_URL = '/api/financial-transactions';
const ADMIN_TOKEN_STORAGE_KEY = 'jbm-admin-token';
const DEFAULT_STATUS = 'จองคิว';
const FINAL_STATUS = 'ซ่อมเสร็จรอส่ง';
const CLOSED_STATUS = 'ปิดงาน';
const STATUS_OPTIONS = ['จองคิว', 'กำลังตรวจเช็ค', 'รออะไหล่', 'กำลังซ่อม', FINAL_STATUS, CLOSED_STATUS];
const IN_SHOP_STATUSES = ['กำลังตรวจเช็ค', 'รออะไหล่', 'กำลังซ่อม', FINAL_STATUS];
const ADMIN_TABLE_STATUSES = STATUS_OPTIONS;
const STATUS_ALIASES = new Map([
  ['1', DEFAULT_STATUS],
  ['2', 'กำลังตรวจเช็ค'],
  ['3', 'รออะไหล่'],
  ['4', 'กำลังซ่อม'],
  ['5', FINAL_STATUS],
  ['6', CLOSED_STATUS],
  ['เช็ครถ', 'กำลังตรวจเช็ค'],
  ['เสร็จรอส่ง', FINAL_STATUS],
]);
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
const FINANCIAL_PAYMENT_METHODS = ['รูดบัตร', 'โอน JBM', 'โอน SCB', 'โอน UOB', 'เงินสด', 'อื่น ๆ'];
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
  receipt_images: [],
};

const emptyFinancialTransaction = {
  id: '',
  date: dateInputValue(new Date()),
  time: '',
  type: 'income',
  payment_method: 'เงินสด',
  description: '',
  amount: '',
};

const LEGACY_STOCK_PRODUCTS_STORAGE_KEY = 'jbm-stock-products-v1';
const LEGACY_STOCK_CATEGORIES_STORAGE_KEY = 'jbm-stock-categories-v1';
const LEGACY_STOCK_MOVEMENTS_STORAGE_KEY = 'jbm-stock-movements-v1';
const STOCK_PRODUCTS_STORAGE_KEY = 'jbm-stock-products-v2';
const STOCK_CATEGORIES_STORAGE_KEY = 'jbm-stock-categories-v2';
const STOCK_MOVEMENTS_STORAGE_KEY = 'jbm-stock-movements-v2';
const INITIAL_STOCK_PRODUCTS = [];
const INITIAL_STOCK_CATEGORIES = [];
const INITIAL_STOCK_MOVEMENTS = [];
const emptyStockProduct = {
  id: '',
  code: '',
  name: '',
  part_no: '',
  category: '',
  brand: '',
  car_models: '',
  price: '',
  location: '',
  quantity: 0,
  reorder_point: 0,
  supplier: '',
  engine_number: '',
  image_url: '',
  note: '',
};
const emptyStockCategory = {
  id: '',
  name: '',
  is_active: true,
};

function clearStockStorageKeys() {
  window.localStorage.removeItem(LEGACY_STOCK_PRODUCTS_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STOCK_CATEGORIES_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STOCK_MOVEMENTS_STORAGE_KEY);
  window.localStorage.removeItem(STOCK_PRODUCTS_STORAGE_KEY);
  window.localStorage.removeItem(STOCK_CATEGORIES_STORAGE_KEY);
  window.localStorage.removeItem(STOCK_MOVEMENTS_STORAGE_KEY);
}

function isLegacyMockStockProducts(products) {
  if (!Array.isArray(products)) return false;
  const codes = new Set(products.map((product) => product?.code || product?.product_code));
  return products.length >= 15 && [...codes].filter((code) => /^JBM-\d{3}$/.test(String(code))).length >= 15;
}

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

function currentYearMonth() {
  const today = dateInputValue(new Date());
  return { year: today.slice(0, 4), month: today.slice(5, 7) };
}

function daysInMonth(year, month) {
  const count = new Date(Number(year), Number(month), 0).getDate();
  return Array.from({ length: count }, (_, index) => `${year}-${month}-${String(index + 1).padStart(2, '0')}`);
}

function normalizeFinancialTransaction(transaction = {}) {
  return {
    ...emptyFinancialTransaction,
    ...transaction,
    id: transaction.id || '',
    date: String(transaction.date || emptyFinancialTransaction.date).slice(0, 10),
    time: transaction.time ? String(transaction.time).slice(0, 5) : '',
    type: transaction.type === 'expense' ? 'expense' : 'income',
    payment_method: transaction.payment_method || 'เงินสด',
    description: transaction.description || '',
    amount: transaction.amount ?? '',
  };
}

function financialDateKey(transaction) {
  return String(transaction.date || '').slice(0, 10);
}

function normalizeVehicle(vehicle = {}) {
  return {
    ...emptyVehicle,
    ...vehicle,
    status: normalizeVehicleStatus(vehicle.status),
    repair_cost: vehicle.repair_cost ?? '',
    mileage: vehicle.mileage ?? '',
    receipt_images: Array.isArray(vehicle.receipt_images) ? vehicle.receipt_images.filter(Boolean) : [],
  };
}

function normalizeVehicleStatus(status) {
  const raw = String(status || '').trim();
  const mapped = STATUS_ALIASES.get(raw) || raw;
  return STATUS_OPTIONS.includes(mapped) ? mapped : DEFAULT_STATUS;
}

function normalizeStockProduct(product = {}) {
  const quantity = Math.max(0, Number(product.quantity || 0));
  const reorderPoint = Math.max(0, Number(product.reorder_point || 0));
  const code = product.code || product.product_code || '';
  return {
    ...emptyStockProduct,
    ...product,
    id: product.id || `stk-${Date.now()}`,
    code,
    name: product.name || product.product_name || '',
    part_no: product.part_no || product.product_number || code,
    category: product.category || 'อื่น ๆ',
    brand: product.brand || product.product_brand || '',
    car_models: product.car_models || product.car_model || '',
    price: Number(product.price || product.unit_cost || 0),
    location: product.location || product.storage_location || '',
    quantity,
    reorder_point: reorderPoint,
    supplier: product.supplier || '',
    engine_number: product.engine_number || '',
    image_url: product.image_url || product.image || '',
    note: product.note || '',
  };
}

function normalizeStockCategory(category = {}) {
  return {
    ...emptyStockCategory,
    ...category,
    id: category.id || `stock-cat-${Date.now()}`,
    name: String(category.name || '').trim(),
    is_active: category.is_active !== false,
  };
}

function stockStatus(product) {
  const quantity = Number(product.quantity || 0);
  if (quantity === 0) return 'หมดสต็อก';
  if (quantity <= Number(product.reorder_point || 0)) return 'ใกล้หมด';
  return 'พร้อมใช้งาน';
}

function makeStockMovement(product, type, change, before, after, note = '') {
  return {
    id: `stock-move-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    product_id: product.id,
    code: product.code,
    name: product.name,
    type,
    quantity_change: change,
    quantity_before: before,
    quantity_after: after,
    note,
  };
}

function vehicleImages(vehicle = {}) {
  return Array.from(new Set([
    ...(Array.isArray(vehicle.receipt_images) ? vehicle.receipt_images : []),
    vehicle.receipt_image,
  ].filter(Boolean)));
}

function dateKey(vehicle) {
  return vehicle.booking_date || vehicle.estimated_completion_date || String(vehicle.created_at || '').slice(0, 10);
}

function isFinal(vehicle) {
  return vehicle.status === FINAL_STATUS;
}

function isInShop(vehicle) {
  return IN_SHOP_STATUSES.includes(normalizeVehicleStatus(vehicle.status));
}

function isCountedVehicle(vehicle) {
  return normalizeVehicleStatus(vehicle.status) !== DEFAULT_STATUS;
}

function isVisibleInAdminTable(vehicle) {
  return ADMIN_TABLE_STATUSES.includes(vehicle.status);
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

function parseDateKey(value) {
  const key = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : '';
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return dateInputValue(next);
}

function chartRange(filter, customStart, customEnd) {
  const today = dateInputValue(new Date());
  const year = today.slice(0, 4);
  const month = today.slice(0, 7);
  if (filter === 'today') return { start: today, end: today };
  if (filter === '7d') return { start: addDays(today, -6), end: today };
  if (filter === '30d') return { start: addDays(today, -29), end: today };
  if (filter === 'year') return { start: `${year}-01-01`, end: `${year}-12-31` };
  if (filter === 'custom') return { start: customStart || today, end: customEnd || customStart || today };
  return { start: `${month}-01`, end: `${month}-${String(new Date(Number(year), Number(today.slice(5, 7)), 0).getDate()).padStart(2, '0')}` };
}

function previousMonthRange() {
  const today = new Date();
  const previous = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const year = previous.getFullYear();
  const month = String(previous.getMonth() + 1).padStart(2, '0');
  return { start: `${year}-${month}-01`, end: `${year}-${month}-${String(new Date(year, previous.getMonth() + 1, 0).getDate()).padStart(2, '0')}` };
}

function inChartRange(value, range) {
  const key = parseDateKey(value);
  if (!key) return false;
  return key >= range.start && key <= range.end;
}

function chartVehicleRevenue(vehicle) {
  return isFinal(vehicle) ? Number(vehicle.repair_cost || 0) : 0;
}

function chartVehiclePartsCost(vehicle) {
  return Number(vehicle.parts_cost || vehicle.stock_cost || vehicle.parts_total || vehicle.part_cost || 0);
}

function chartGroupKey(vehicle, period) {
  const key = parseDateKey(dateKey(vehicle));
  if (!key) return '';
  if (period === 'year') return key.slice(0, 4);
  if (period === 'month') return key.slice(0, 7);
  return key;
}

function buildRevenueChartRows(vehicles, range, period) {
  const rows = new Map();
  vehicles.filter((vehicle) => inChartRange(dateKey(vehicle), range)).forEach((vehicle) => {
    const key = chartGroupKey(vehicle, period);
    if (!key) return;
    const row = rows.get(key) || { label: key, revenue: 0 };
    row.revenue += chartVehicleRevenue(vehicle);
    rows.set(key, row);
  });
  return Array.from(rows.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function buildStatusChartRows(vehicles, range, period) {
  const rows = new Map();
  vehicles.filter((vehicle) => inChartRange(dateKey(vehicle), range)).forEach((vehicle) => {
    const key = chartGroupKey(vehicle, period);
    if (!key) return;
    const status = normalizeVehicleStatus(vehicle.status);
    const row = rows.get(key) || { label: key };
    row[status] = Number(row[status] || 0) + 1;
    rows.set(key, row);
  });
  return Array.from(rows.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function buildBrandRows(vehicles, range, revenueMode = false) {
  const rows = new Map();
  vehicles.filter((vehicle) => inChartRange(dateKey(vehicle), range)).forEach((vehicle) => {
    const brand = String(vehicle.brand || 'ไม่ระบุ').trim() || 'ไม่ระบุ';
    const row = rows.get(brand) || { brand, cars: 0, revenue: 0 };
    row.cars += 1;
    row.revenue += chartVehicleRevenue(vehicle);
    rows.set(brand, row);
  });
  return Array.from(rows.values()).sort((a, b) => (revenueMode ? b.revenue - a.revenue : b.cars - a.cars)).slice(0, 10);
}

function stockChartSummary(products) {
  return {
    totalValue: products.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0),
    totalItems: products.length,
    lowStock: products.filter((item) => stockStatus(item) === 'ใกล้หมด').length,
    outOfStock: products.filter((item) => stockStatus(item) === 'หมดสต็อก').length,
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readFilesAsDataUrls(files) {
  return Promise.all(Array.from(files || []).map(readFileAsDataUrl));
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
            <p className="text-xl font-extrabold leading-tight text-slate-950">JBM PRO AUTO</p>
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
      setError('กรุณากรอกชื่อเจ้าของรถ เบอร์โทรศัพท์ ทะเบียนรถ หรือเลขใบแจ้งหนี้');
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
      setError(vehicle ? '' : 'ไม่พบข้อมูลรถจากคำค้นหานี้ กรุณาตรวจสอบข้อมูลอีกครั้ง');
    } catch {
      setResult(null);
      setError('ระบบค้นหายังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/10 sm:p-7">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
            <Search className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-slate-950">ค้นหาสถานะรถ</h2>
            <p className="mt-1 text-lg font-bold text-slate-600">ชื่อเจ้าของรถ / เบอร์โทรศัพท์ / ทะเบียนรถ / เลขใบแจ้งหนี้</p>
          </div>
        </div>
        <form onSubmit={submit} className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-16 rounded-lg border border-slate-300 bg-white px-5 text-xl font-bold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            placeholder="กรอกชื่อ เบอร์โทร ทะเบียนรถ หรือเลขใบแจ้งหนี้"
          />
          <button className="inline-flex min-h-16 items-center justify-center gap-2 rounded-lg bg-blue-700 px-8 text-xl font-extrabold text-white hover:bg-blue-800" type="submit">
            <Search className="h-6 w-6" />
            {loading ? 'กำลังค้นหา' : 'ค้นหา'}
          </button>
        </form>
        {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-lg font-bold text-rose-700">{error}</p>}
      </div>

      {result && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-base font-bold text-slate-500">เลขใบแจ้งหนี้/ใบเสร็จ</p>
                <h2 className="text-3xl font-extrabold text-slate-950">{result.invoice_number || '-'}</h2>
                <p className="text-xl font-bold text-slate-700">{result.brand || '-'} {result.model || ''}</p>
              </div>
              <StatusPill status={result.status} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="ชื่อลูกค้า" value={result.owner_name || '-'} />
              <Info label="ทะเบียนรถ" value={result.license_plate || '-'} />
              <Info label="เลขใบแจ้งหนี้" value={result.invoice_number || '-'} />
              <Info label="สถานะปัจจุบัน" value={result.status || DEFAULT_STATUS} />
            </div>
          </div>
          <StatusProgress status={result.status} />
        </div>
      )}
    </section>
  );
}

function StatusProgress({ status }) {
  const activeIndex = Math.max(0, STATUS_OPTIONS.indexOf(status || DEFAULT_STATUS));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-2xl font-extrabold text-slate-950">Progress Status</h2>
      <div className="mt-5 space-y-3">
        {STATUS_OPTIONS.map((item, index) => {
          const active = index === activeIndex;
          const done = index < activeIndex;
          return (
            <div key={item} className="grid grid-cols-[auto_1fr] gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg font-extrabold ${active ? 'border-blue-700 bg-blue-700 text-white shadow-lg shadow-blue-900/20' : done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-slate-500'}`}>
                  {index + 1}
                </div>
                {index < STATUS_OPTIONS.length - 1 && <div className={`h-8 w-1 ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              </div>
              <div className={`min-h-11 rounded-lg border px-4 py-2 ${active ? 'border-blue-200 bg-blue-50 text-blue-900' : done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                <p className="text-xl font-extrabold">{item}</p>
                {active && <p className="text-base font-bold">สถานะปัจจุบัน</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
              <p className="inline-flex rounded-lg border border-yellow-300/50 bg-yellow-300/15 px-4 py-2 text-lg font-extrabold text-yellow-200">JBM PRO AUTO | European Car Service</p>
              <h1 className="max-w-5xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                JBM PRO AUTO เราเป็นศูนย์บริการ Service รถยุโรปครบวงจร
                <span className="block mt-3">และจำหน่ายอะไหล่ติดตั้ง จัดส่งทั่วไทย</span>
              </h1>
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
                  <p className="text-3xl font-extrabold">9:30-18:00</p>
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
                <h2 className="text-4xl font-extrabold leading-tight">JBM PRO AUTO</h2>
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
              <h2 className="text-4xl font-extrabold">JBM PRO AUTO</h2>
              <div className="space-y-4 text-xl leading-8 text-blue-50">
                <p className="flex gap-3"><MapPin className="mt-1 h-6 w-6 shrink-0 text-yellow-300" />616 1B ซอย พัฒนาการ 30 สวนหลวง เขตสวนหลวง กรุงเทพมหานคร 10250</p>
                <p className="flex gap-3"><Phone className="mt-1 h-6 w-6 shrink-0 text-yellow-300" />099 265 1133</p>
                <p className="flex gap-3"><Clock className="mt-1 h-6 w-6 shrink-0 text-yellow-300" />วันจันทร์ - วันเสาร์ 9:30-18:00<br />วันอาทิตย์ ปิดทำการ</p>
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
                src="https://www.google.com/maps?q=JBM%20PRO%20AUTO%20616%201B%20%E0%B8%8B%E0%B8%AD%E0%B8%A2%20%E0%B8%9E%E0%B8%B1%E0%B8%92%E0%B8%99%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%A3%2030%20%E0%B8%AA%E0%B8%A7%E0%B8%99%E0%B8%AB%E0%B8%A5%E0%B8%A7%E0%B8%87%20%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B8%A3&output=embed"
                title="แผนที่ JBM PRO AUTO"
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
    <div className="min-h-screen bg-slate-100">
      <Header />
      <main>
        <section className="relative overflow-hidden bg-slate-950">
          <img
            className="absolute inset-0 h-full w-full object-cover opacity-35"
            src="https://images.unsplash.com/photo-1632823471565-1ecdf5c35867?auto=format&fit=crop&w=1800&q=80"
            alt=""
          />
          <div className="absolute inset-0 bg-slate-950/70" />
          <div className="relative mx-auto max-w-[1440px] px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
            <div className="max-w-4xl text-white">
              <p className="inline-flex rounded-lg border border-blue-300/40 bg-blue-400/15 px-4 py-2 text-lg font-extrabold text-blue-100">JBM PRO AUTO Service Tracking</p>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">เช็คสถานะรถเข้าศูนย์บริการ</h1>
              <p className="mt-5 max-w-3xl text-xl leading-9 text-blue-50 sm:text-2xl">ค้นหาข้อมูลเคสซ่อมด้วยชื่อเจ้าของรถ เบอร์โทรศัพท์ ทะเบียนรถ หรือเลขใบแจ้งหนี้ พร้อมดูสถานะปัจจุบันแบบเป็นขั้นตอน</p>
            </div>
          </div>
        </section>
        <section className="bg-slate-100 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <CustomerSearch />
        </section>
      </main>
    </div>
  );
}

function AdminApp() {
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '';
  });
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
  const [stockProducts, setStockProducts] = useState(() => {
    if (typeof window === 'undefined') return INITIAL_STOCK_PRODUCTS;
    try {
      const saved = window.localStorage.getItem(STOCK_PRODUCTS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      if (isLegacyMockStockProducts(parsed)) {
        clearStockStorageKeys();
        return INITIAL_STOCK_PRODUCTS;
      }
      const source = Array.isArray(parsed) ? parsed : INITIAL_STOCK_PRODUCTS;
      return source.map(normalizeStockProduct);
    } catch {
      return INITIAL_STOCK_PRODUCTS.map(normalizeStockProduct);
    }
  });
  const [stockCategories, setStockCategories] = useState(() => {
    if (typeof window === 'undefined') return INITIAL_STOCK_CATEGORIES;
    try {
      const saved = window.localStorage.getItem(STOCK_CATEGORIES_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      const source = Array.isArray(parsed) ? parsed : INITIAL_STOCK_CATEGORIES;
      return source.map(normalizeStockCategory).filter((category) => category.name);
    } catch {
      return INITIAL_STOCK_CATEGORIES;
    }
  });
  const [stockMovements, setStockMovements] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(STOCK_MOVEMENTS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_STOCK_MOVEMENTS;
    } catch {
      return INITIAL_STOCK_MOVEMENTS;
    }
  });
  const activeTab = active;

  const headers = useCallback(() => ({ 'x-vehicle-admin-token': token }), [token]);
  const setActiveTab = useCallback((key) => {
    setActive(key);
    setMobileMenu(false);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    setToken('');
    setTokenInput('');
    setLoginError('');
    setVehicles([]);
    setActive('dashboard');
    setMobileMenu(false);
  }, []);

  const loadVehicles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?admin=1`, { headers: headers() });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data?.error || 'load failed');
      setVehicles((Array.isArray(data) ? data : []).map(normalizeVehicle));
    } catch (error) {
      console.error('[admin] load vehicles failed', error);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [headers, token]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    window.localStorage.setItem(STOCK_PRODUCTS_STORAGE_KEY, JSON.stringify(stockProducts));
  }, [stockProducts]);

  useEffect(() => {
    window.localStorage.setItem(STOCK_CATEGORIES_STORAGE_KEY, JSON.stringify(stockCategories));
  }, [stockCategories]);

  useEffect(() => {
    window.localStorage.setItem(STOCK_MOVEMENTS_STORAGE_KEY, JSON.stringify(stockMovements));
  }, [stockMovements]);

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
      const nextToken = tokenInput.trim();
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, nextToken);
      setToken(nextToken);
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

  const uploadVehicleImage = async (vehicle, files) => {
    if (!files || files.length === 0) return;
    setUploadingId(vehicle.id);
    try {
      const newImages = await readFilesAsDataUrls(files);
      const images = [...vehicleImages(vehicle), ...newImages];
      const saved = await saveVehicle({ ...vehicle, receipt_image: images[0] || '', receipt_images: images });
      setSelectedVehicle((current) => (current?.id === vehicle.id ? saved : current));
    } finally {
      setUploadingId('');
    }
  };

  const adjustStockQuantity = useCallback((id, amount) => {
    setStockProducts((items) => items.map((item) => {
      if (item.id !== id) return item;
      const before = Number(item.quantity || 0);
      const after = Math.max(0, before + amount);
      const change = after - before;
      if (change === 0) return item;
      setStockMovements((current) => [
        makeStockMovement(item, change > 0 ? 'รับเข้า' : 'เบิกออก', change, before, after, change > 0 ? 'เพิ่มจำนวนจากหน้าสต็อก' : 'ลดจำนวนจากหน้าสต็อก'),
        ...current,
      ]);
      return { ...item, quantity: after };
    }));
  }, []);

  const saveStockProduct = useCallback((product) => {
    const normalized = normalizeStockProduct(product);
    setStockProducts((items) => {
      const exists = items.some((item) => item.id === normalized.id);
      if (!exists) {
        const created = { ...normalized, id: normalized.id || `stk-${Date.now()}` };
        setStockMovements((current) => [
          makeStockMovement(created, 'เพิ่มสินค้าใหม่', Number(created.quantity || 0), 0, Number(created.quantity || 0), 'เพิ่มสินค้าใหม่'),
          ...current,
        ]);
        return [created, ...items];
      }
      return items.map((item) => {
        if (item.id !== normalized.id) return item;
        const before = Number(item.quantity || 0);
        const after = Number(normalized.quantity || 0);
        if (before !== after) {
          setStockMovements((current) => [
            makeStockMovement(normalized, 'ปรับยอด', after - before, before, after, 'แก้ไขจำนวนจากฟอร์มสินค้า'),
            ...current,
          ]);
        }
        return normalized;
      });
    });
  }, []);

  const deleteStockProduct = useCallback((product) => {
    setStockProducts((items) => items.filter((item) => item.id !== product.id));
    setStockMovements((current) => [
      makeStockMovement(product, 'ลบสินค้า', -Number(product.quantity || 0), Number(product.quantity || 0), 0, 'ลบรายการสินค้าออกจากสต็อก'),
      ...current,
    ]);
  }, []);

  const saveStockCategory = useCallback((category) => {
    const normalized = normalizeStockCategory(category);
    if (!normalized.name) return;
    setStockCategories((items) => {
      const exists = Boolean(normalized.id) && items.some((item) => item.id === normalized.id);
      if (exists) return items.map((item) => (item.id === normalized.id ? normalized : item));
      return [{ ...normalized, id: normalized.id || `stock-cat-${Date.now()}` }, ...items];
    });
  }, []);

  const toggleStockCategory = useCallback((id) => {
    setStockCategories((items) => items.map((item) => (
      item.id === id ? { ...item, is_active: !item.is_active } : item
    )));
  }, []);

  const clearStockSampleData = useCallback(() => {
    clearStockStorageKeys();
    setStockProducts(INITIAL_STOCK_PRODUCTS);
    setStockCategories(INITIAL_STOCK_CATEGORIES);
    setStockMovements(INITIAL_STOCK_MOVEMENTS);
  }, []);

  const stats = useMemo(() => {
    const finalRows = vehicles.filter(isFinal);
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const year = today.slice(0, 4);
    const revenueFor = (prefix) => finalRows.filter((vehicle) => dateKey(vehicle).startsWith(prefix)).reduce((sum, vehicle) => sum + Number(vehicle.repair_cost || 0), 0);
    return {
      all: vehicles.filter(isCountedVehicle).length,
      inShop: vehicles.filter(isInShop).length,
      booking: vehicles.filter((vehicle) => vehicle.status === DEFAULT_STATUS).length,
      checking: vehicles.filter((vehicle) => vehicle.status === IN_SHOP_STATUSES[0]).length,
      parts: vehicles.filter((vehicle) => vehicle.status === IN_SHOP_STATUSES[1]).length,
      repairing: vehicles.filter((vehicle) => vehicle.status === IN_SHOP_STATUSES[2]).length,
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
      if (!isVisibleInAdminTable(vehicle)) return false;
      if (statusFilter === 'all' && !isCountedVehicle(vehicle)) return false;
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
    ['calendar', 'ปฏิทินจองคิว', CalendarDays],
    ['productStock', 'สต็อกสินค้า', Package],
    ['in-shop', 'รถค้างในร้าน', Wrench],
    ['finance', 'การเงิน', Coins],
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
                  setActiveTab(key);
                  if (key === 'form') setEditing({ ...emptyVehicle });
                }}
                className={`flex min-h-14 w-full items-center gap-3 rounded-lg px-3 text-left text-lg font-extrabold ${activeTab === key ? 'bg-blue-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
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
              <h1 className="text-3xl font-extrabold">{nav.find(([key]) => key === activeTab)?.[1]}</h1>
            <p className="text-lg text-slate-500">สีสถานะชัดเจน | ปิดงานไม่นับเป็นรถค้างในร้าน</p>
            </div>
            <button className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 px-4 text-lg font-extrabold text-slate-700 hover:bg-slate-50" onClick={logout} type="button">
              <Lock className="h-5 w-5" />
              ออก
            </button>
          </div>
          <div className="space-y-6 p-4 sm:p-6">
            {activeTab === 'dashboard' && <Dashboard stats={stats} vehicles={vehicles} stockProducts={stockProducts} statusFilter={dashboardStatusFilter} setStatusFilter={setDashboardStatusFilter} />}
            {activeTab === 'form' && <VehicleForm initial={editing || emptyVehicle} onSave={saveVehicle} onCancel={() => setActiveTab('dashboard')} />}
            {activeTab === 'all' && (
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
                onAdd={() => { setEditing({ ...emptyVehicle }); setActiveTab('form'); }}
                onEdit={(vehicle) => { setEditing(vehicle); setActiveTab('form'); }}
                onDelete={deleteVehicle}
                onStatus={updateStatus}
                onDetail={setSelectedVehicle}
                onUpload={uploadVehicleImage}
                uploadingId={uploadingId}
              />
            )}
            {activeTab === 'calendar' && <BookingCalendar vehicles={vehicles} />}
            {activeTab === 'productStock' && (
              <StockProductPage
                products={stockProducts}
                categories={stockCategories}
                movements={stockMovements}
                onAdjustQuantity={adjustStockQuantity}
                onSaveProduct={saveStockProduct}
                onDeleteProduct={deleteStockProduct}
                onSaveCategory={saveStockCategory}
                onToggleCategory={toggleStockCategory}
                onClearSampleData={clearStockSampleData}
              />
            )}
            {activeTab === 'in-shop' && <InShop vehicles={inShopVehicles} query={inShopQuery} setQuery={setInShopQuery} />}
            {activeTab === 'revenue' && <RevenueSummary vehicles={vehicles} />}
            {activeTab === 'finance' && <FinancialAdmin headers={headers} />}
            {activeTab === 'charts' && <ManagementDashboard vehicles={vehicles} stockProducts={stockProducts} />}
          </div>
        </main>
      </div>
      {selectedVehicle && <VehicleDetailModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />}
    </div>
  );
}

function StockProductPage({ products, categories, movements, onAdjustQuantity, onSaveProduct, onDeleteProduct, onSaveCategory, onToggleCategory, onClearSampleData }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [tab, setTab] = useState('stock');
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    const text = search.trim().toLowerCase();
    return products.filter((product) => [
      product.code,
      product.name,
      product.part_no,
      product.brand,
      product.car_models,
      product.engine_number,
      product.supplier,
    ].some((value) => !text || String(value || '').toLowerCase().includes(text))
      && (categoryFilter === 'all' || product.category === categoryFilter)
      && (stockFilter === 'all' || stockStatus(product) === stockFilter));
  }, [categoryFilter, products, search, stockFilter]);

  const stockStats = useMemo(() => {
    return {
      totalItems: products.length,
      totalQuantity: products.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      totalValue: products.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0),
      ready: products.filter((item) => stockStatus(item) === 'พร้อมใช้งาน').length,
      lowStock: products.filter((item) => stockStatus(item) === 'ใกล้หมด').length,
      outOfStock: products.filter((item) => stockStatus(item) === 'หมดสต็อก').length,
    };
  }, [products]);
  const activeCategories = useMemo(() => categories.filter((category) => category.is_active), [categories]);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Package className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-slate-950">สต็อกสินค้า</h2>
              <p className="text-lg font-bold text-slate-500">จัดการสินค้า หมวดหมู่ และประวัติเข้า-ออกสต็อก</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-5 text-lg font-extrabold text-rose-700 hover:bg-rose-50" onClick={() => setConfirmClearOpen(true)} type="button">
              ล้างข้อมูลสต็อกเดิม
            </button>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-lg font-extrabold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              onClick={() => setEditingProduct({ ...emptyStockProduct, category: activeCategories[0]?.name || '' })}
              disabled={activeCategories.length === 0}
              type="button"
            >
              <Plus className="h-5 w-5" />
              เพิ่มสินค้า
            </button>
          </div>
        </div>
        {activeCategories.length === 0 && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-lg font-extrabold text-amber-800">
            กรุณาสร้างหมวดหมู่สินค้าก่อน
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 md:grid-cols-3">
          {[
            ['stock', 'สต็อกสินค้า'],
            ['categories', 'จัดการหมวดหมู่'],
            ['movements', 'ประวัติเข้า-ออกสต็อก'],
          ].map(([key, label]) => (
            <button key={key} className={`min-h-12 rounded-lg px-4 text-lg font-extrabold ${tab === key ? 'bg-blue-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`} onClick={() => setTab(key)} type="button">
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'stock' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StockSummaryCard title="มูลค่าสต็อกรวม" value={`฿${money(stockStats.totalValue)}`} className="border-emerald-200 bg-emerald-50 text-emerald-800" />
            <StockSummaryCard title="อะไหล่ทั้งหมด" value={`${stockStats.totalItems} รายการ`} className="border-blue-200 bg-blue-50 text-blue-800" />
            <StockSummaryCard title="พร้อมใช้งาน" value={`${stockStats.ready} รายการ`} className="border-teal-200 bg-teal-50 text-teal-800" />
            <StockSummaryCard title="ใกล้หมด" value={`${stockStats.lowStock} รายการ`} className="border-amber-200 bg-amber-50 text-amber-800" />
            <StockSummaryCard title="หมดสต็อก" value={`${stockStats.outOfStock} รายการ`} className="border-rose-200 bg-rose-50 text-rose-800" />
            <StockSummaryCard title="คงเหลือรวม" value={`${stockStats.totalQuantity} ชิ้น`} className="border-slate-200 bg-slate-50 text-slate-800" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr_1fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-lg font-bold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="ค้นหารหัส ชื่อ Part No. ยี่ห้อ รถ เครื่องยนต์ หรือผู้จำหน่าย" />
              </div>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="min-h-12 rounded-lg border border-slate-300 bg-white px-4 text-lg font-bold text-slate-800">
                <option value="all">ทุกหมวดหมู่</option>
                {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>
              <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="min-h-12 rounded-lg border border-slate-300 bg-white px-4 text-lg font-bold text-slate-800">
                <option value="all">ทุกสถานะ</option>
                <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                <option value="ใกล้หมด">ใกล้หมด</option>
                <option value="หมดสต็อก">หมดสต็อก</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[1280px] text-left text-lg">
              <thead className="bg-slate-100 text-base font-extrabold text-slate-600">
                <tr>
                  <th className="p-4">รหัส / Part No.</th>
                  <th className="p-4">สินค้า</th>
                  <th className="p-4">หมวดหมู่</th>
                  <th className="p-4">รถที่รองรับ</th>
                  <th className="p-4 text-right">ราคา</th>
                  <th className="p-4 text-center">คงเหลือ</th>
                  <th className="p-4 text-center">สถานะ</th>
                  <th className="p-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProducts.map((product) => {
                  const quantity = Number(product.quantity || 0);
                  const statusText = stockStatus(product);
                  const statusClass = statusText === 'หมดสต็อก' ? 'border-rose-200 bg-rose-50 text-rose-800' : statusText === 'ใกล้หมด' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
                  return (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-mono font-extrabold text-blue-800">{product.code}</p>
                        <p className="font-mono text-base font-bold text-slate-500">{product.part_no || '-'}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <StockProductImage product={product} className="h-16 w-16" />
                          <div>
                            <p className="font-extrabold text-slate-950">{product.name}</p>
                            <p className="text-base font-bold text-slate-500">{product.brand} | {product.supplier || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-700">{product.category}</td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700">{product.car_models || '-'}</p>
                        <p className="text-base font-bold text-slate-500">เครื่อง: {product.engine_number || '-'}</p>
                      </td>
                      <td className="p-4 text-right font-extrabold text-slate-800">฿{money(product.price)}</td>
                      <td className="p-4 text-center text-2xl font-extrabold text-slate-950">{quantity}</td>
                      <td className="p-4 text-center"><span className={`inline-flex rounded-lg border px-3 py-1.5 text-base font-extrabold ${statusClass}`}>{statusText}</span></td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-blue-700 hover:bg-blue-50" onClick={() => setViewingProduct(product)} type="button" title="ดูรายละเอียด"><Eye className="h-5 w-5" /></button>
                          <button className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => setEditingProduct(product)} type="button" title="แก้ไข"><Edit3 className="h-5 w-5" /></button>
                          <button className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-rose-200 bg-white text-2xl font-extrabold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onAdjustQuantity(product.id, -1)} disabled={quantity === 0} type="button" title="ลดจำนวน">-</button>
                          <button className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-200 bg-white text-2xl font-extrabold text-emerald-700 hover:bg-emerald-50" onClick={() => onAdjustQuantity(product.id, 1)} type="button" title="เพิ่มจำนวน">+</button>
                          <button className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setDeletingProduct(product)} type="button" title="ลบรายการ"><Trash2 className="h-5 w-5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td className="p-8 text-center text-slate-500" colSpan={8}>
                      {products.length === 0 ? 'ยังไม่มีสินค้าในสต็อก' : 'ไม่พบสินค้าในสต็อกจากตัวกรองนี้'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'categories' && (
        <StockCategoryManager categories={categories} products={products} onEdit={setEditingCategory} onToggle={onToggleCategory} onAdd={() => setEditingCategory({ ...emptyStockCategory })} />
      )}

      {tab === 'movements' && <StockMovementHistory movements={movements} />}

      {editingProduct && (
        <StockProductModal product={editingProduct} categories={activeCategories} onClose={() => setEditingProduct(null)} onSave={(product) => { onSaveProduct(product); setEditingProduct(null); }} />
      )}
      {viewingProduct && <StockProductDetail product={viewingProduct} onClose={() => setViewingProduct(null)} />}
      {editingCategory && (
        <StockCategoryModal category={editingCategory} onClose={() => setEditingCategory(null)} onSave={(category) => { onSaveCategory(category); setEditingCategory(null); }} />
      )}
      {deletingProduct && (
        <StockConfirmDialog
          title="ลบสินค้า"
          message={`ต้องการลบ ${deletingProduct.name || deletingProduct.code || 'สินค้านี้'} ออกจากสต็อกหรือไม่ ระบบจะบันทึกประวัติเป็นประเภทลบสินค้า`}
          confirmText="ลบสินค้า"
          onCancel={() => setDeletingProduct(null)}
          onConfirm={() => {
            onDeleteProduct(deletingProduct);
            setDeletingProduct(null);
          }}
        />
      )}
      {confirmClearOpen && (
        <StockConfirmDialog
          title="ล้างข้อมูลสต็อกเดิม"
          message="ระบบจะลบข้อมูลสินค้า หมวดหมู่ และประวัติเข้า-ออกสต็อกที่เคยบันทึกไว้ในเครื่องนี้ แล้วกลับไปเป็นค่าว่างทั้งหมด"
          confirmText="ล้างข้อมูลสต็อกเดิม"
          onCancel={() => setConfirmClearOpen(false)}
          onConfirm={() => {
            onClearSampleData();
            setConfirmClearOpen(false);
          }}
        />
      )}
    </section>
  );
}

function StockCategoryManager({ categories, products, onEdit, onToggle, onAdd }) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950">จัดการหมวดหมู่</h2>
          <p className="text-lg font-bold text-slate-500">เพิ่ม แก้ไขชื่อ และเปิด/ปิดใช้งานหมวดหมู่ โดยไม่ลบข้อมูลเดิม</p>
        </div>
        <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-lg font-extrabold text-white hover:bg-blue-800" onClick={onAdd} type="button"><Plus className="h-5 w-5" />เพิ่มหมวดหมู่</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const count = products.filter((product) => product.category === category.name).length;
          return (
            <div key={category.id} className={`rounded-xl border p-4 ${category.is_active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-slate-400">{category.id}</p>
                  <h3 className="text-2xl font-extrabold text-slate-950">{category.name}</h3>
                  <p className="text-lg font-bold text-slate-500">สินค้าเชื่อมโยง {count} รายการ</p>
                </div>
                <span className={`rounded-lg px-3 py-1 text-base font-extrabold ${category.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{category.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button className="rounded-lg border border-slate-200 px-4 py-2 text-lg font-extrabold text-blue-700 hover:bg-blue-50" onClick={() => onEdit(category)} type="button">แก้ไข</button>
                <button className="rounded-lg border border-slate-200 px-4 py-2 text-lg font-extrabold text-slate-700 hover:bg-slate-50" onClick={() => onToggle(category.id)} type="button">{category.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StockMovementHistory({ movements }) {
  return (
    <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1080px] text-left text-lg">
        <thead className="bg-slate-100 text-base font-extrabold text-slate-600">
          <tr>
            <th className="p-4">วันเวลา</th>
            <th className="p-4">ID สินค้า</th>
            <th className="p-4">รหัสอะไหล่</th>
            <th className="p-4">ชื่ออะไหล่รถยนต์</th>
            <th className="p-4 text-center">ประเภท</th>
            <th className="p-4 text-center">เปลี่ยน</th>
            <th className="p-4 text-center">ก่อนหน้า</th>
            <th className="p-4 text-center">หลังปรับ</th>
            <th className="p-4">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {movements.map((movement) => (
            <tr key={movement.id} className="hover:bg-slate-50">
              <td className="p-4 font-bold text-slate-600">{new Date(movement.created_at).toLocaleString('th-TH')}</td>
              <td className="p-4 font-mono text-base font-bold text-slate-500">{movement.product_id}</td>
              <td className="p-4 font-mono font-extrabold text-blue-800">{movement.code}</td>
              <td className="p-4 font-bold text-slate-900">{movement.name}</td>
              <td className="p-4 text-center"><span className="rounded-lg bg-blue-50 px-3 py-1 text-base font-extrabold text-blue-800">{movement.type}</span></td>
              <td className={`p-4 text-center font-extrabold ${Number(movement.quantity_change || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{Number(movement.quantity_change || 0) > 0 ? `+${movement.quantity_change}` : movement.quantity_change}</td>
              <td className="p-4 text-center font-bold text-slate-500">{movement.quantity_before}</td>
              <td className="p-4 text-center font-extrabold text-slate-900">{movement.quantity_after}</td>
              <td className="p-4 font-bold text-slate-500">{movement.note || '-'}</td>
            </tr>
          ))}
          {movements.length === 0 && <tr><td className="p-8 text-center text-slate-500" colSpan={9}>ยังไม่มีประวัติเข้า-ออกสต็อก</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

function StockProductImage({ product, className }) {
  if (product.image_url) {
    return (
      <img
        className={`shrink-0 rounded-lg border border-slate-200 bg-white object-cover ${className}`}
        src={product.image_url}
        alt={product.name || 'รูปสินค้า'}
      />
    );
  }
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100 text-slate-400 ${className}`}>
      <Package className="h-7 w-7" />
    </div>
  );
}

function StockProductModal({ product, categories, onClose, onSave }) {
  const [form, setForm] = useState(() => normalizeStockProduct(product));
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const uploadProductImage = async (files) => {
    const [image] = await readFilesAsDataUrls(files);
    if (image) update('image_url', image);
  };
  const submit = (event) => {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    onSave({ ...form, quantity: Math.max(0, Number(form.quantity || 0)), reorder_point: Math.max(0, Number(form.reorder_point || 0)), price: Math.max(0, Number(form.price || 0)) });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <StockModalHeader title={product.id ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'} onClose={onClose} />
        <div className="mb-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
          <StockProductImage product={form} className="h-28 w-28" />
          <div className="flex-1">
            <p className="text-xl font-extrabold text-slate-800">รูปสินค้า</p>
            <p className="text-base font-bold text-slate-500">อัปโหลดรูปเพื่อเก็บเป็น Base64 ใน localStorage ชั่วคราว</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-lg font-extrabold text-blue-700 hover:bg-blue-50">
                <ImagePlus className="h-5 w-5" />
                เลือกรูป
                <input className="sr-only" type="file" accept="image/*" onChange={(event) => uploadProductImage(event.target.files)} />
              </label>
              {form.image_url && (
                <button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-rose-200 bg-white px-4 text-lg font-extrabold text-rose-700 hover:bg-rose-50" onClick={() => update('image_url', '')} type="button">
                  ลบรูป
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StockInput label="รหัสสินค้า" value={form.code} onChange={(value) => update('code', value)} />
          <StockInput label="ชื่อสินค้า" value={form.name} onChange={(value) => update('name', value)} />
          <StockInput label="Part No." value={form.part_no} onChange={(value) => update('part_no', value)} />
          <label className="block"><span className="text-xl font-extrabold text-slate-800">หมวดหมู่</span><select value={form.category} onChange={(event) => update('category', event.target.value)} className="mt-2 min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-xl text-slate-950"><option value="">เลือกหมวดหมู่</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label>
          <StockInput label="ยี่ห้อ" value={form.brand} onChange={(value) => update('brand', value)} />
          <StockInput label="รถที่รองรับ" value={form.car_models} onChange={(value) => update('car_models', value)} />
          <StockInput label="ราคาสินค้า" value={form.price} onChange={(value) => update('price', value)} type="number" />
          <StockInput label="ตำแหน่งจัดเก็บ" value={form.location} onChange={(value) => update('location', value)} />
          <StockInput label="คงเหลือ" value={form.quantity} onChange={(value) => update('quantity', value)} type="number" />
          <StockInput label="จุดเตือนขั้นต่ำ" value={form.reorder_point} onChange={(value) => update('reorder_point', value)} type="number" />
          <StockInput label="ผู้จัดจำหน่าย" value={form.supplier} onChange={(value) => update('supplier', value)} />
          <StockInput label="หมายเลขเครื่องยนต์" value={form.engine_number} onChange={(value) => update('engine_number', value)} />
          <label className="block xl:col-span-3"><span className="text-xl font-extrabold text-slate-800">หมายเหตุ</span><textarea value={form.note || ''} onChange={(event) => update('note', event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-xl text-slate-950" /></label>
        </div>
        <StockModalActions onClose={onClose} />
      </form>
    </div>
  );
}

function StockProductDetail({ product, onClose }) {
  const rows = [['รหัสสินค้า', product.code], ['ชื่อสินค้า', product.name], ['Part No.', product.part_no], ['หมวดหมู่', product.category], ['ยี่ห้อ', product.brand], ['รถที่รองรับ', product.car_models], ['ราคาสินค้า', `฿${money(product.price)}`], ['ตำแหน่งจัดเก็บ', product.location], ['คงเหลือ', `${product.quantity} ชิ้น`], ['จุดเตือนขั้นต่ำ', product.reorder_point], ['ผู้จัดจำหน่าย', product.supplier], ['หมายเลขเครื่องยนต์', product.engine_number], ['หมายเหตุ', product.note]];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <StockModalHeader title="รายละเอียดสินค้า" onClose={onClose} />
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <StockProductImage product={product} className="h-44 w-full" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">{rows.map(([label, value]) => <Info key={label} label={label} value={value || '-'} />)}</div>
      </div>
    </div>
  );
}

function StockCategoryModal({ category, onClose, onSave }) {
  const [form, setForm] = useState(() => normalizeStockCategory(category));
  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <form onSubmit={submit} className="w-full max-w-xl rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <StockModalHeader title={category.id ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'} onClose={onClose} />
        <StockInput label="ชื่อหมวดหมู่" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
        <label className="mt-4 flex items-center gap-3 text-xl font-extrabold text-slate-800"><input checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} type="checkbox" className="h-5 w-5" />เปิดใช้งานหมวดหมู่</label>
        <StockModalActions onClose={onClose} />
      </form>
    </div>
  );
}

function StockConfirmDialog({ title, message, confirmText, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-xl rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl" role="dialog" aria-modal="true">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-950">{title}</h2>
            <p className="mt-2 text-lg font-bold text-slate-600">{message}</p>
          </div>
          <button className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50" onClick={onCancel} type="button" aria-label="ปิด">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button className="inline-flex min-h-14 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-xl font-extrabold text-slate-700 hover:bg-slate-50" onClick={onCancel} type="button">
            ยกเลิก
          </button>
          <button className="inline-flex min-h-14 items-center justify-center rounded-lg bg-rose-700 px-6 text-xl font-extrabold text-white hover:bg-rose-800" onClick={onConfirm} type="button">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function StockModalHeader({ title, onClose }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
      <h2 className="text-3xl font-extrabold text-slate-950">{title}</h2>
      <button className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50" onClick={onClose} type="button" aria-label="ปิด"><X className="h-6 w-6" /></button>
    </div>
  );
}

function StockInput({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-xl font-extrabold text-slate-800">{label}</span>
      <input value={value ?? ''} onChange={(event) => onChange(event.target.value)} type={type} min={type === 'number' ? '0' : undefined} className="mt-2 min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-xl text-slate-950" />
    </label>
  );
}

function StockModalActions({ onClose }) {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
      <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-xl font-extrabold text-slate-700 hover:bg-slate-50" onClick={onClose} type="button"><X className="h-6 w-6" />ยกเลิก</button>
      <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 text-xl font-extrabold text-white shadow-sm hover:bg-blue-800" type="submit"><Save className="h-6 w-6" />บันทึก</button>
    </div>
  );
}

function StockSummaryCard({ title, value, className }) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${className}`}>
      <p className="text-lg font-extrabold">{title}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function Dashboard({ stats, vehicles, stockProducts, statusFilter, setStatusFilter }) {
  const today = dateInputValue(new Date());
  const monthRange = chartRange('month');
  const monthVehicles = vehicles.filter((vehicle) => inChartRange(dateKey(vehicle), monthRange));
  const monthRevenue = monthVehicles.reduce((sum, vehicle) => sum + chartVehicleRevenue(vehicle), 0);
  const monthProfit = monthVehicles.reduce((sum, vehicle) => sum + chartVehicleRevenue(vehicle) - chartVehiclePartsCost(vehicle), 0);
  const stockSummary = stockChartSummary(stockProducts);
  const overdueVehicles = vehicles.filter((vehicle) => {
    const dueDate = parseDateKey(vehicle.estimated_completion_date);
    return dueDate && dueDate < today && normalizeVehicleStatus(vehicle.status) !== CLOSED_STATUS;
  });
  const dueTodayVehicles = vehicles.filter((vehicle) => parseDateKey(vehicle.estimated_completion_date) === today && normalizeVehicleStatus(vehicle.status) !== CLOSED_STATUS);
  const waitingPartsVehicles = vehicles.filter((vehicle) => normalizeVehicleStatus(vehicle.status) === 'รออะไหล่');
  const outOfStockProducts = stockProducts.filter((item) => stockStatus(item) === 'หมดสต็อก');
  const lowStockProducts = stockProducts.filter((item) => stockStatus(item) === 'ใกล้หมด');
  const latestVehicles = [...vehicles].sort((a, b) => String(b.created_at || b.booking_date || '').localeCompare(String(a.created_at || a.booking_date || ''))).slice(0, 10);
  const topCards = [
    { title: 'รถค้างในร้าน', value: `${stats.inShop} คัน`, icon: <Wrench />, tone: 'rose', filter: 'inShop' },
    { title: 'จองคิว', value: `${stats.booking} คัน`, icon: <ClipboardList />, tone: 'pink', filter: DEFAULT_STATUS },
    { title: 'กำลังซ่อม', value: `${stats.repairing} คัน`, icon: <Wrench />, tone: 'amber', filter: 'กำลังซ่อม' },
    { title: 'รออะไหล่', value: `${stats.parts} คัน`, icon: <Package />, tone: 'orange', filter: 'รออะไหล่' },
    { title: 'ปิดงานเดือนนี้', value: `${monthVehicles.filter((vehicle) => normalizeVehicleStatus(vehicle.status) === CLOSED_STATUS).length} คัน`, icon: <CheckCircle2 />, tone: 'slate', filter: CLOSED_STATUS },
  ];
  const businessCards = [
    { title: 'รายได้เดือนนี้', value: `฿${money(monthRevenue)}`, icon: <Banknote />, tone: 'blue' },
    { title: 'กำไรเดือนนี้', value: `฿${money(monthProfit)}`, icon: <Coins />, tone: monthProfit >= 0 ? 'emerald' : 'rose' },
    { title: 'รถเข้าซ่อมเดือนนี้', value: `${monthVehicles.length} คัน`, icon: <Car />, tone: 'slate' },
    { title: 'มูลค่าสต็อกคงเหลือ', value: `฿${money(stockSummary.totalValue)}`, icon: <Package />, tone: 'emerald' },
    { title: 'สินค้าใกล้หมด', value: `${stockSummary.lowStock} รายการ`, icon: <Clock />, tone: 'amber' },
  ];
  const alerts = [
    { level: 'red', title: 'รถเกินกำหนดส่ง', value: `${overdueVehicles.length} คัน` },
    { level: 'yellow', title: 'รถต้องส่งวันนี้', value: `${dueTodayVehicles.length} คัน` },
    { level: 'yellow', title: 'รถรออะไหล่', value: `${waitingPartsVehicles.length} คัน` },
    { level: 'red', title: 'สินค้าหมดสต็อก', value: `${outOfStockProducts.length} รายการ` },
    { level: 'yellow', title: 'สินค้าใกล้หมด', value: `${lowStockProducts.length} รายการ` },
  ];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-950">Executive Dashboard</h2>
        <p className="text-lg font-bold text-slate-500">ภาพรวมสำคัญของอู่จากข้อมูลจริงในระบบ</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {topCards.map((card) => (
          <DashboardCompactCard key={card.title} {...card} active={statusFilter === card.filter} onClick={card.filter ? () => setStatusFilter(card.filter) : undefined} />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {businessCards.map((card) => <DashboardCompactCard key={card.title} {...card} />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-2xl font-extrabold text-slate-950">แจ้งเตือนวันนี้</h3>
          <div className="mt-4 space-y-3">
            {alerts.map((alert) => (
              <div key={alert.title} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${alert.level === 'red' ? 'bg-rose-600' : 'bg-amber-500'}`} />
                  <p className="text-lg font-extrabold text-slate-800">{alert.title}</p>
                </div>
                <p className={`text-xl font-extrabold ${alert.level === 'red' ? 'text-rose-700' : 'text-amber-700'}`}>{alert.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-950">รายการล่าสุด</h3>
              <p className="text-base font-bold text-slate-500">10 รายการล่าสุด</p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-base">
              <thead className="bg-slate-100 font-extrabold text-slate-600">
                <tr>
                  <th className="p-3">เลขใบแจ้งหนี้</th>
                  <th className="p-3">ทะเบียนรถ</th>
                  <th className="p-3">ลูกค้า</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3">วันที่รับรถ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {latestVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-slate-950">{vehicle.invoice_number || '-'}</td>
                    <td className="p-3 font-bold text-slate-700">{vehicle.license_plate || '-'}</td>
                    <td className="p-3 font-bold text-slate-700">{vehicle.owner_name || '-'}</td>
                    <td className="p-3"><StatusPill status={vehicle.status} /></td>
                    <td className="p-3 font-bold text-slate-600">{dateText(vehicle.booking_date)}</td>
                  </tr>
                ))}
                {latestVehicles.length === 0 && <tr><td className="p-6 text-center text-slate-500" colSpan={5}>ยังไม่มีข้อมูลรถ</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

function DashboardCompactCard({ title, value, icon, tone = 'slate', active = false, onClick }) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    pink: 'border-pink-200 bg-pink-50 text-pink-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    orange: 'border-orange-200 bg-orange-50 text-orange-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
  };
  const Component = onClick ? 'button' : 'div';
  return (
    <Component className={`rounded-xl border p-4 text-left shadow-sm transition ${tones[tone] || tones.slate} ${onClick ? 'hover:-translate-y-0.5 hover:shadow-md' : ''} ${active ? 'ring-4 ring-blue-200' : ''}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-extrabold">{title}</p>
        {React.cloneElement(icon, { className: 'h-5 w-5' })}
      </div>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </Component>
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
  if (!compact) {
    const cardGroups = [
      cards.slice(0, 3),
      cards.slice(3, 6),
      cards.slice(6),
    ];
    return (
      <div className="space-y-4">
        {cardGroups.map((group, index) => (
          <div key={index} className={`grid gap-4 ${index < 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
            {group.map((card) => <Metric key={card.title} {...card} active={activeFilter === card.filter} onClick={onFilter && card.filter ? () => onFilter(card.filter) : undefined} />)}
          </div>
        ))}
      </div>
    );
  }
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

function BookingCalendar({ vehicles }) {
  const current = currentYearMonth();
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const bookingRows = useMemo(() => vehicles.filter((vehicle) => vehicle.status === DEFAULT_STATUS), [vehicles]);
  const days = useMemo(() => {
    return daysInMonth(year, month).map((date) => ({
      date,
      vehicles: bookingRows.filter((vehicle) => String(vehicle.booking_date || '').slice(0, 10) === date),
    }));
  }, [bookingRows, month, year]);
  const totalBookings = days.reduce((sum, day) => sum + day.vehicles.length, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950">ปฏิทินจองคิวรายเดือน</h2>
          <p className="text-lg font-bold text-slate-500">แสดงเฉพาะรถสถานะ {DEFAULT_STATUS} รวม {totalBookings} คัน</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={month} onChange={(event) => setMonth(event.target.value)} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-lg">
            {MONTHS_TH.map((item, index) => <option key={item} value={String(index + 1).padStart(2, '0')}>{item}</option>)}
          </select>
          <select value={year} onChange={(event) => setYear(event.target.value)} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-lg">
            {REPORT_YEARS.map((item) => <option key={item} value={String(item)}>{item + 543}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {days.map((day) => {
          const hasBookings = day.vehicles.length > 0;
          return (
            <div key={day.date} className={`rounded-xl border p-4 ${hasBookings ? 'border-pink-200 bg-pink-50/70' : 'border-blue-100 bg-blue-50/50'}`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className={`${hasBookings ? 'text-pink-950' : 'text-blue-950'} text-xl font-extrabold`}>วันที่ {Number(day.date.slice(8, 10))}</p>
                  <p className={`${hasBookings ? 'text-pink-700' : 'text-blue-700'} text-base font-bold`}>{dateText(day.date)}</p>
                </div>
                <p className={`rounded-lg px-3 py-1 text-lg font-extrabold text-white ${hasBookings ? 'bg-pink-600' : 'bg-blue-700'}`}>{day.vehicles.length} คัน</p>
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
          );
        })}
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

const CHART_STATUS_COLORS = {
  [DEFAULT_STATUS]: '#db2777',
  'กำลังตรวจเช็ค': '#0284c7',
  'รออะไหล่': '#ea580c',
  'กำลังซ่อม': '#ca8a04',
  [FINAL_STATUS]: '#059669',
  [CLOSED_STATUS]: '#020617',
};

const CHART_FILTERS = [
  ['today', 'วันนี้'],
  ['7d', '7 วัน'],
  ['30d', '30 วัน'],
  ['month', 'เดือนนี้'],
  ['year', 'ปีนี้'],
  ['custom', 'กำหนดเอง'],
];

function ManagementDashboard({ vehicles, stockProducts }) {
  const [filter, setFilter] = useState('month');
  const [customStart, setCustomStart] = useState(dateInputValue(new Date()));
  const [customEnd, setCustomEnd] = useState(dateInputValue(new Date()));
  const [revenuePeriod, setRevenuePeriod] = useState('day');
  const [vehiclePeriod, setVehiclePeriod] = useState('day');
  const range = useMemo(() => chartRange(filter, customStart, customEnd), [customEnd, customStart, filter]);
  const currentMonth = useMemo(() => chartRange('month'), []);
  const currentYear = useMemo(() => chartRange('year'), []);
  const previousMonth = useMemo(() => previousMonthRange(), []);
  const filteredVehicles = useMemo(() => vehicles.filter((vehicle) => inChartRange(dateKey(vehicle), range)), [range, vehicles]);
  const monthVehicles = useMemo(() => vehicles.filter((vehicle) => inChartRange(dateKey(vehicle), currentMonth)), [currentMonth, vehicles]);
  const yearVehicles = useMemo(() => vehicles.filter((vehicle) => inChartRange(dateKey(vehicle), currentYear)), [currentYear, vehicles]);
  const todayRange = useMemo(() => chartRange('today'), []);
  const todayVehicles = useMemo(() => vehicles.filter((vehicle) => inChartRange(dateKey(vehicle), todayRange)), [todayRange, vehicles]);
  const stockSummary = useMemo(() => stockChartSummary(stockProducts), [stockProducts]);
  const revenueRows = useMemo(() => buildRevenueChartRows(vehicles, range, revenuePeriod), [range, revenuePeriod, vehicles]);
  const statusRows = useMemo(() => buildStatusChartRows(vehicles, range, vehiclePeriod), [range, vehiclePeriod, vehicles]);
  const brandRows = useMemo(() => buildBrandRows(vehicles, range), [range, vehicles]);
  const brandRevenueRows = useMemo(() => buildBrandRows(vehicles, range, true), [range, vehicles]);
  const rangeRevenue = filteredVehicles.reduce((sum, vehicle) => sum + chartVehicleRevenue(vehicle), 0);
  const monthRevenue = monthVehicles.reduce((sum, vehicle) => sum + chartVehicleRevenue(vehicle), 0);
  const previousRevenue = vehicles.filter((vehicle) => inChartRange(dateKey(vehicle), previousMonth)).reduce((sum, vehicle) => sum + chartVehicleRevenue(vehicle), 0);
  const revenueDiff = monthRevenue - previousRevenue;
  const revenuePercent = previousRevenue > 0 ? (revenueDiff / previousRevenue) * 100 : (monthRevenue > 0 ? 100 : 0);
  const todayProfit = todayVehicles.reduce((sum, vehicle) => sum + chartVehicleRevenue(vehicle) - chartVehiclePartsCost(vehicle), 0);
  const monthProfit = monthVehicles.reduce((sum, vehicle) => sum + chartVehicleRevenue(vehicle) - chartVehiclePartsCost(vehicle), 0);
  const yearProfit = yearVehicles.reduce((sum, vehicle) => sum + chartVehicleRevenue(vehicle) - chartVehiclePartsCost(vehicle), 0);
  const monthClosed = monthVehicles.filter(isFinal).length;
  const stockPieRows = [
    { name: 'สินค้าใกล้หมด', value: stockSummary.lowStock, color: '#f59e0b' },
    { name: 'สินค้าหมดสต็อก', value: stockSummary.outOfStock, color: '#e11d48' },
    { name: 'สินค้าอื่น', value: Math.max(stockSummary.totalItems - stockSummary.lowStock - stockSummary.outOfStock, 0), color: '#2563eb' },
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-950">Management Dashboard</h2>
            <p className="text-lg font-bold text-slate-500">ศูนย์รวมรายงานผู้บริหารจากข้อมูลรถและสต็อกจริงในระบบ</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CHART_FILTERS.map(([key, label]) => (
              <button key={key} className={`min-h-11 rounded-lg px-4 text-lg font-extrabold ${filter === key ? 'bg-blue-700 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`} onClick={() => setFilter(key)} type="button">
                {label}
              </button>
            ))}
          </div>
        </div>
        {filter === 'custom' && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input className="min-h-12 rounded-lg border border-slate-300 px-4 text-lg font-bold text-slate-800" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
            <input className="min-h-12 rounded-lg border border-slate-300 px-4 text-lg font-bold text-slate-800" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ManagementKpi title="รายได้เดือนนี้" value={`฿${money(monthRevenue)}`} tone="blue" />
        <ManagementKpi title="กำไรเดือนนี้" value={`฿${money(monthProfit)}`} tone={monthProfit >= 0 ? 'emerald' : 'rose'} />
        <ManagementKpi title="รถเข้าซ่อมเดือนนี้" value={`${monthVehicles.length} คัน`} tone="slate" />
        <ManagementKpi title="รถปิดงานเดือนนี้" value={`${monthClosed} คัน`} tone="emerald" />
        <ManagementKpi title="มูลค่าสต็อกคงเหลือ" value={`฿${money(stockSummary.totalValue)}`} tone="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <ManagementPanel title="กราฟรายได้" action={<ChartPeriodTabs value={revenuePeriod} onChange={setRevenuePeriod} />}>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <ManagementMiniStat title="ยอดรวมช่วงนี้" value={`฿${money(rangeRevenue)}`} />
            <ManagementMiniStat title="เทียบเดือนก่อน" value={`${revenueDiff >= 0 ? '+' : ''}฿${money(revenueDiff)}`} />
            <ManagementMiniStat title="เปอร์เซ็นต์" value={`${revenuePercent >= 0 ? '+' : ''}${revenuePercent.toFixed(1)}%`} />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueRows}>
                <CartesianGrid stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `฿${money(value)}`} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="#bfdbfe" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ManagementPanel>

        <ManagementPanel title="กำไร / ขาดทุน">
          <div className="grid gap-3">
            <ProfitCard title="กำไรวันนี้" value={todayProfit} />
            <ProfitCard title="กำไรเดือนนี้" value={monthProfit} />
            <ProfitCard title="กำไรปีนี้" value={yearProfit} />
          </div>
        </ManagementPanel>
      </div>

      <ManagementPanel title="กราฟจำนวนรถเข้าซ่อม" action={<ChartPeriodTabs value={vehiclePeriod} onChange={setVehiclePeriod} />}>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusRows}>
              <CartesianGrid stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${value} คัน`} />
              <Legend />
              {STATUS_OPTIONS.map((status) => (
                <Bar key={status} dataKey={status} stackId="cars" fill={CHART_STATUS_COLORS[status] || '#64748b'} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ManagementPanel>

      <div className="grid gap-5 xl:grid-cols-2">
        <ManagementPanel title="กราฟสต็อกสินค้า">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <ManagementMiniStat title="มูลค่าสินค้าคงคลังรวม" value={`฿${money(stockSummary.totalValue)}`} />
            <ManagementMiniStat title="จำนวนสินค้า" value={`${stockSummary.totalItems} รายการ`} />
            <ManagementMiniStat title="สินค้าใกล้หมด" value={`${stockSummary.lowStock} รายการ`} />
            <ManagementMiniStat title="สินค้าหมดสต็อก" value={`${stockSummary.outOfStock} รายการ`} />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stockPieRows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100}>
                  {stockPieRows.map((row) => <Cell key={row.name} fill={row.color} />)}
                </Pie>
                <Tooltip formatter={(value) => `${value} รายการ`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ManagementPanel>

        <ManagementPanel title="ยี่ห้อรถที่เข้าซ่อมมากที่สุด Top 10">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brandRows} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="brand" type="category" tick={{ fontSize: 12 }} width={110} />
                <Tooltip formatter={(value) => `${value} คัน`} />
                <Bar dataKey="cars" fill="#0f766e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ManagementPanel>
      </div>

      <ManagementPanel title="กราฟรายได้แยกตามยี่ห้อรถ">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={brandRevenueRows}>
              <CartesianGrid stroke="#e2e8f0" />
              <XAxis dataKey="brand" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `฿${money(value)}`} />
              <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ManagementPanel>
    </section>
  );
}

function ChartPeriodTabs({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {[['day', 'รายวัน'], ['month', 'รายเดือน'], ['year', 'รายปี']].map(([key, label]) => (
        <button key={key} className={`min-h-10 rounded-lg px-3 text-base font-extrabold ${value === key ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-white'}`} onClick={() => onChange(key)} type="button">
          {label}
        </button>
      ))}
    </div>
  );
}

function ManagementPanel({ title, action, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-extrabold text-slate-950">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ManagementKpi({ title, value, tone }) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
  };
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-lg font-extrabold">{title}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function ManagementMiniStat({ title, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-base font-extrabold text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function ProfitCard({ title, value }) {
  const profit = Number(value || 0) >= 0;
  return (
    <div className={`rounded-xl border p-4 ${profit ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-extrabold">{title}</p>
        <span className="rounded-lg bg-white/70 px-3 py-1 text-base font-extrabold">{profit ? 'กำไร' : 'ขาดทุน'}</span>
      </div>
      <p className="mt-2 text-3xl font-extrabold">฿{money(value)}</p>
    </div>
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

  const uploadImage = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const newImages = await readFilesAsDataUrls(files);
    const images = [...vehicleImages(form), ...newImages];
    setForm((current) => ({ ...current, receipt_image: images[0] || '', receipt_images: images }));
    event.target.value = '';
  };

  const removeImage = (image) => {
    const images = vehicleImages(form).filter((item) => item !== image);
    setForm((current) => ({ ...current, receipt_image: images[0] || '', receipt_images: images }));
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
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-col gap-2 border-b border-slate-200 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-extrabold text-blue-700">ข้อมูลเคสซ่อม</p>
          <h2 className="text-2xl font-extrabold text-slate-950 sm:text-3xl">เพิ่ม/แก้ไขข้อมูลรถ</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <StatusPill status={form.status} />
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50" onClick={onCancel} type="button"><X className="h-4 w-4" />ยกเลิก</button>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-800" type="submit"><Save className="h-4 w-4" />{saving ? 'กำลังบันทึก' : 'บันทึก'}</button>
        </div>
      </div>
      {error && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-base font-bold text-rose-700">{error}</p>}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-2.5">
          <FormSection title="ข้อมูลรถ">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
              <Field label="ทะเบียนรถ" value={form.license_plate} onChange={(value) => update('license_plate', value)} />
              <BrandField form={form} update={update} mode={brandMode} setMode={setBrandMode} />
              <ModelField form={form} update={update} mode={modelMode} setMode={setModelMode} choices={modelChoices} />
              <Field label="สีรถ" value={form.color} onChange={(value) => update('color', value)} />
              <Field label="VIN / เลขตัวถัง" value={form.vin} onChange={(value) => update('vin', value)} />
              <Field label="เลขไมล์" type="number" value={form.mileage} onChange={(value) => update('mileage', value)} />
            </div>
          </FormSection>

          <FormSection title="ข้อมูลลูกค้า">
            <div className="grid gap-2.5 md:grid-cols-2">
              <Field label="ชื่อลูกค้า" value={form.owner_name} onChange={(value) => update('owner_name', value)} />
              <Field label="เบอร์โทรศัพท์" value={form.phone} onChange={(value) => update('phone', value)} />
            </div>
          </FormSection>

          <FormSection title="ข้อมูลงานซ่อม">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              <Field label="เลขใบแจ้งหนี้/ใบเสร็จ" value={form.invoice_number} onChange={(value) => update('invoice_number', value)} />
              <SelectField label="สถานะรถ" value={form.status} onChange={(value) => update('status', value)} options={STATUS_OPTIONS} />
              <Field label="ค่าซ่อม" type="number" value={form.repair_cost} onChange={(value) => update('repair_cost', value)} />
              <Field label="วันที่จอง" type="date" value={form.booking_date} onChange={(value) => update('booking_date', value)} />
              <Field label="วันที่กำหนดเสร็จ" type="date" value={form.estimated_completion_date} onChange={(value) => update('estimated_completion_date', value)} />
            </div>
            <div className="mt-2.5">
              <TextArea label="รายละเอียดสถานะ" value={form.status_detail} onChange={(value) => update('status_detail', value)} />
            </div>
          </FormSection>

          <FormSection title="รูปภาพ">
            <div className="grid gap-2.5 lg:grid-cols-[auto_1fr] lg:items-start">
              <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-blue-800">
                <ImagePlus className="h-5 w-5" />
                อัปโหลดรูป
                <input className="hidden" type="file" accept="image/*" multiple onChange={uploadImage} />
              </label>
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2.5">
                {vehicleImages(form).length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {vehicleImages(form).map((image, index) => (
                      <div key={`${image}-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
                        <img className="h-24 w-full rounded-lg bg-slate-50 object-contain" src={image} alt={`รูปประกอบรถ ${index + 1}`} />
                        <button className="mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-rose-200 px-3 text-sm font-bold text-rose-700 hover:bg-rose-50" onClick={() => removeImage(image)} type="button">
                          ลบ
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-base font-bold text-slate-500">ยังไม่มีรูป Preview</p>
                )}
              </div>
            </div>
          </FormSection>
        </div>

        <aside className="h-fit rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm xl:sticky xl:top-20">
          <h3 className="text-lg font-extrabold text-slate-950">สรุปข้อมูล</h3>
          <div className="mt-2.5 space-y-2">
            <FormSummaryRow label="ทะเบียน" value={form.license_plate || '-'} />
            <FormSummaryRow label="ลูกค้า" value={form.owner_name || '-'} />
            <FormSummaryRow label="ยี่ห้อ" value={form.brand || '-'} />
            <FormSummaryRow label="รุ่น" value={form.model || '-'} />
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm font-bold text-slate-500">สถานะ</p>
              <div className="mt-1"><StatusPill status={form.status} /></div>
            </div>
            <FormSummaryRow label="ค่าซ่อม" value={`฿${money(form.repair_cost)}`} />
          </div>
        </aside>
      </div>
    </form>
  );
}

function FormSection({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
      <h3 className="text-lg font-extrabold text-slate-950">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function FormSummaryRow({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 truncate text-lg font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function BrandField({ form, update, mode, setMode }) {
  return (
    <div>
      <span className="text-sm font-extrabold text-slate-800">ยี่ห้อรถ</span>
      <div className="mt-1 grid gap-1">
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
            className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">เลือกยี่ห้อ</option>
            {BRAND_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : (
          <input value={form.brand || ''} onChange={(event) => update('brand', event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="พิมพ์ยี่ห้อเอง" />
        )}
        <button className="min-h-8 justify-self-start rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50" type="button" onClick={() => setMode(mode === 'select' ? 'custom' : 'select')}>
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
      <span className="text-sm font-extrabold text-slate-800">รุ่นรถ</span>
      <div className="mt-1 grid gap-1">
        {mode === 'select' && hasChoices ? (
          <select value={choices.includes(form.model) ? form.model : ''} onChange={(event) => update('model', event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
            <option value="">เลือกรุ่น</option>
            {choices.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : (
          <input value={form.model || ''} onChange={(event) => update('model', event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="พิมพ์รุ่นเอง" />
        )}
        <button className="min-h-8 justify-self-start rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50" type="button" onClick={() => setMode(mode === 'select' ? 'custom' : 'select')}>
          {mode === 'select' ? 'พิมพ์เอง' : 'เลือกจากรายการ'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-800">{label}</span>
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-800">{label}</span>
      <select value={value || DEFAULT_STATUS} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <div className="mt-1"><StatusPill status={value || DEFAULT_STATUS} /></div>
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-800">{label}</span>
      <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
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
                      {vehicleImages(vehicle).length > 0 ? (
                        <>
                          <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-base font-extrabold text-emerald-800 hover:bg-emerald-100" href={vehicleImages(vehicle)[0]} onClick={(event) => event.stopPropagation()} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-5 w-5" />
                            ดูรูป {vehicleImages(vehicle).length}
                          </a>
                          <img className="h-12 w-16 rounded-lg border border-slate-200 object-cover" src={vehicleImages(vehicle)[0]} alt="รูปประกอบรถ" />
                        </>
                      ) : (
                        <span className="text-base font-bold text-slate-500">ยังไม่มีรูป</span>
                      )}
                    </div>
                    <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-base font-extrabold text-blue-800 hover:bg-blue-100" onClick={(event) => event.stopPropagation()}>
                      <ImagePlus className="h-5 w-5" />
                      {uploadingId === vehicle.id ? 'กำลังอัปโหลด' : vehicleImages(vehicle).length > 0 ? 'เพิ่มรูป' : 'อัปโหลดรูป'}
                      <input
                        className="hidden"
                        type="file"
                        accept="image/*"
                        multiple
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => onUpload(vehicle, event.target.files)}
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
            <p className="mt-1 text-lg font-bold">แสดงเฉพาะรถที่กำลังตรวจเช็ค รออะไหล่ กำลังซ่อม หรือซ่อมเสร็จรอส่ง</p>
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

function FinancialAdmin({ headers }) {
  const current = currentYearMonth();
  const [transactions, setTransactions] = useState([]);
  const [summaryTransactions, setSummaryTransactions] = useState([]);
  const [filters, setFilters] = useState({ search: '', type: 'all', payment_method: 'all', day: 'all', month: 'all', year: 'all' });
  const [summaryMonth, setSummaryMonth] = useState(current.month);
  const [summaryMonthYear, setSummaryMonthYear] = useState(current.year);
  const [summaryYear, setSummaryYear] = useState(current.year);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.set(key, value);
      });
      const response = await fetch(`${FINANCIAL_API_URL}?${params.toString()}`, { headers: headers() });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'โหลดข้อมูลการเงินไม่สำเร็จ');
      setTransactions((Array.isArray(data.transactions) ? data.transactions : []).map(normalizeFinancialTransaction));
    } catch (loadError) {
      setError(loadError.message || 'โหลดข้อมูลการเงินไม่สำเร็จ');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [filters, headers]);

  const loadSummaryTransactions = useCallback(async () => {
    try {
      const response = await fetch(FINANCIAL_API_URL, { headers: headers() });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'โหลดข้อมูลสรุปการเงินไม่สำเร็จ');
      setSummaryTransactions((Array.isArray(data.transactions) ? data.transactions : []).map(normalizeFinancialTransaction));
    } catch (summaryError) {
      setError(summaryError.message || 'โหลดข้อมูลสรุปการเงินไม่สำเร็จ');
      setSummaryTransactions([]);
    }
  }, [headers]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    loadSummaryTransactions();
  }, [loadSummaryTransactions]);

  const summary = useMemo(() => {
    const today = dateInputValue(new Date());
    const selectedMonth = `${summaryMonthYear}-${summaryMonth}`;
    const calculate = (rows) => {
      const income = rows.filter((row) => row.type === 'income').reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const expense = rows.filter((row) => row.type === 'expense').reduce((sum, row) => sum + Number(row.amount || 0), 0);
      return { income, expense, balance: income - expense };
    };

    return {
      day: calculate(summaryTransactions.filter((row) => financialDateKey(row) === today)),
      month: calculate(summaryTransactions.filter((row) => financialDateKey(row).startsWith(selectedMonth))),
      year: calculate(summaryTransactions.filter((row) => financialDateKey(row).startsWith(summaryYear))),
      total: calculate(summaryTransactions),
      byYear: REPORT_YEARS.map((item) => {
        const total = calculate(summaryTransactions.filter((row) => financialDateKey(row).startsWith(String(item))));
        return { year: item, ...total };
      }),
    };
  }, [summaryMonth, summaryMonthYear, summaryTransactions, summaryYear]);

  const saveTransaction = async (transaction) => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(FINANCIAL_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify(transaction),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'บันทึกรายการการเงินไม่สำเร็จ');
      setEditing(null);
      await Promise.all([loadTransactions(), loadSummaryTransactions()]);
    } catch (saveError) {
      setError(saveError.message || 'บันทึกรายการการเงินไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm('ยืนยันการลบรายการการเงินนี้')) return;
    setError('');
    try {
      const response = await fetch(`${FINANCIAL_API_URL}?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'ลบรายการการเงินไม่สำเร็จ');
      await Promise.all([loadTransactions(), loadSummaryTransactions()]);
    } catch (deleteError) {
      setError(deleteError.message || 'ลบรายการการเงินไม่สำเร็จ');
    }
  };

  const paymentMethods = useMemo(() => {
    const methods = new Set(FINANCIAL_PAYMENT_METHODS);
    summaryTransactions.forEach((row) => {
      if (row.payment_method) methods.add(row.payment_method);
    });
    return Array.from(methods);
  }, [summaryTransactions]);

  return (
    <section className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <FinancialSummaryCard title="สรุปรายวัน" summary={summary.day} icon={<Clock />} tone="blue" />
        <FinancialSummaryCard
          title="งบการเงินรายเดือน"
          summary={summary.month}
          icon={<Wallet />}
          tone="violet"
        >
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <select value={summaryMonth} onChange={(event) => setSummaryMonth(event.target.value)} className="min-h-11 rounded-lg border border-violet-200 bg-white px-3 text-base font-bold text-slate-800">
              {MONTHS_TH.map((item, index) => <option key={item} value={String(index + 1).padStart(2, '0')}>{item}</option>)}
            </select>
            <select value={summaryMonthYear} onChange={(event) => setSummaryMonthYear(event.target.value)} className="min-h-11 rounded-lg border border-violet-200 bg-white px-3 text-base font-bold text-slate-800">
              {REPORT_YEARS.map((item) => <option key={item} value={String(item)}>{item + 543}</option>)}
            </select>
          </div>
        </FinancialSummaryCard>
        <FinancialSummaryCard
          title="งบการเงินรายปี"
          summary={summary.year}
          icon={<Coins />}
          tone="emerald"
        >
          <div className="mb-3">
            <select value={summaryYear} onChange={(event) => setSummaryYear(event.target.value)} className="min-h-11 w-full rounded-lg border border-emerald-200 bg-white px-3 text-base font-bold text-slate-800">
              {REPORT_YEARS.map((item) => <option key={item} value={String(item)}>{item + 543}</option>)}
            </select>
          </div>
        </FinancialSummaryCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <FinancialAmountCard title="รายรับ" value={summary.total.income} className="border-emerald-200 bg-emerald-50 text-emerald-800" icon={<Banknote />} />
        <FinancialAmountCard title="รายจ่าย" value={summary.total.expense} className="border-rose-200 bg-rose-50 text-rose-800" icon={<CreditCard />} />
        <FinancialAmountCard title="ยอดคงเหลือ" value={summary.total.balance} className="border-blue-200 bg-blue-50 text-blue-800" icon={<Wallet />} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-950">จัดการการเงิน</h2>
            <p className="text-lg text-slate-600">ค้นหา กรอง เพิ่ม แก้ไข และลบรายการธุรกรรมของร้าน</p>
          </div>
          <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-xl font-extrabold text-white hover:bg-blue-800" onClick={() => setEditing({ ...emptyFinancialTransaction })} type="button">
            <Plus className="h-6 w-6" />
            เพิ่มรายการธุรกรรม
          </button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr]">
          <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 px-3 text-lg" placeholder="ค้นหารายละเอียดหรือช่องทาง" />
          <select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 px-3 text-lg">
            <option value="all">ทุกประเภท</option>
            <option value="income">รายรับ</option>
            <option value="expense">รายจ่าย</option>
          </select>
          <select value={filters.payment_method} onChange={(event) => setFilters({ ...filters, payment_method: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 px-3 text-lg">
            <option value="all">ทุกช่องทาง</option>
            {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
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
        </div>

        {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-lg font-bold text-rose-700">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[980px] text-left text-lg">
            <thead className="bg-slate-100 text-base font-extrabold text-slate-600">
              <tr>
                <th className="p-4">วันที่</th>
                <th className="p-4">เวลา</th>
                <th className="p-4">ประเภท</th>
                <th className="p-4">ช่องทาง</th>
                <th className="p-4">รายละเอียด</th>
                <th className="p-4 text-right">จำนวนเงิน</th>
                <th className="p-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-700">{dateText(transaction.date)}</td>
                  <td className="p-4 text-slate-700">{transaction.time || '-'}</td>
                  <td className="p-4"><FinancialTypeBadge type={transaction.type} /></td>
                  <td className="p-4"><PaymentBadge method={transaction.payment_method} /></td>
                  <td className="p-4 font-bold text-slate-800">{transaction.description || '-'}</td>
                  <td className={`p-4 text-right font-extrabold ${transaction.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>฿{money(transaction.amount)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-blue-700 hover:bg-blue-50" onClick={() => setEditing(normalizeFinancialTransaction(transaction))} type="button" title="แก้ไข">
                        <Edit3 className="h-5 w-5" />
                      </button>
                      <button className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-rose-700 hover:bg-rose-50" onClick={() => deleteTransaction(transaction.id)} type="button" title="ลบ">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && <tr><td className="p-8 text-center text-slate-500" colSpan={7}>{loading ? 'กำลังโหลดข้อมูลการเงิน' : 'ไม่พบรายการธุรกรรม'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-2xl font-extrabold text-slate-950">สรุปรายปี พ.ศ. 2568-2579</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.byYear.map((row) => (
            <div key={row.year} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xl font-extrabold text-slate-950">{row.year + 543}</p>
              <p className="font-bold text-emerald-700">รับ ฿{money(row.income)}</p>
              <p className="font-bold text-rose-700">จ่าย ฿{money(row.expense)}</p>
              <p className="font-extrabold text-blue-700">คงเหลือ ฿{money(row.balance)}</p>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <FinancialFormModal
          initial={editing}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={saveTransaction}
        />
      )}
    </section>
  );
}

function FinancialSummaryCard({ title, summary, icon, tone, children }) {
  const colors = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${colors[tone] || colors.blue}`}>
      <div className="mb-3 flex items-center justify-between text-lg font-extrabold">
        <p>{title}</p>
        {React.cloneElement(icon, { className: 'h-7 w-7' })}
      </div>
      {children}
      <div className="grid gap-2 text-lg font-bold">
        <p className="text-emerald-700">รายรับ ฿{money(summary.income)}</p>
        <p className="text-rose-700">รายจ่าย ฿{money(summary.expense)}</p>
        <p className="text-3xl font-extrabold">คงเหลือ ฿{money(summary.balance)}</p>
      </div>
    </div>
  );
}

function FinancialAmountCard({ title, value, className, icon }) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between text-lg font-extrabold">
        <p>{title}</p>
        {React.cloneElement(icon, { className: 'h-7 w-7' })}
      </div>
      <p className="text-4xl font-extrabold">฿{money(value)}</p>
    </div>
  );
}

function FinancialTypeBadge({ type }) {
  const isIncome = type === 'income';
  return <span className={`inline-flex rounded-lg border px-3 py-1.5 text-base font-extrabold ${isIncome ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{isIncome ? 'รายรับ' : 'รายจ่าย'}</span>;
}

function PaymentBadge({ method }) {
  return <span className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-base font-extrabold text-blue-800">{method || '-'}</span>;
}

function FinancialFormModal({ initial, saving, onClose, onSave }) {
  const [form, setForm] = useState(() => normalizeFinancialTransaction(initial));
  const [paymentMode, setPaymentMode] = useState(FINANCIAL_PAYMENT_METHODS.includes(initial.payment_method) ? 'select' : 'custom');
  const [error, setError] = useState('');

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.date) {
      setError('กรุณาเลือกวันที่ทำรายการ');
      return;
    }
    if (!form.description.trim()) {
      setError('กรุณากรอกรายละเอียด');
      return;
    }
    if (!form.payment_method.trim()) {
      setError('กรุณาเลือกหรือกรอกช่องทางการเงิน');
      return;
    }
    if (Number(form.amount) < 0 || !Number.isFinite(Number(form.amount))) {
      setError('จำนวนเงินต้องเป็นตัวเลขไม่ติดลบ');
      return;
    }
    await onSave({ ...form, time: form.time || null, amount: Number(form.amount) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl" role="dialog" aria-modal="true">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-lg font-bold text-blue-700">รายการการเงิน</p>
            <h2 className="text-3xl font-extrabold text-slate-950">{form.id ? 'แก้ไขรายการธุรกรรม' : 'เพิ่มรายการธุรกรรม'}</h2>
          </div>
          <button className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50" onClick={onClose} type="button" aria-label="ปิดฟอร์ม">
            <X className="h-6 w-6" />
          </button>
        </div>
        {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-lg font-bold text-rose-700">{error}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="วันที่ทำรายการ" type="date" value={form.date} onChange={(value) => update('date', value)} />
          <Field label="เวลาทำรายการ (ไม่บังคับ)" type="time" value={form.time} onChange={(value) => update('time', value)} />
          <label className="block">
            <span className="text-xl font-extrabold text-slate-800">ประเภท</span>
            <select value={form.type} onChange={(event) => update('type', event.target.value)} className="mt-2 min-h-16 w-full rounded-lg border border-slate-300 bg-white px-5 text-xl text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="income">รายรับ</option>
              <option value="expense">รายจ่าย</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xl font-extrabold text-slate-800">ช่องทางการเงิน</span>
            {paymentMode === 'select' ? (
              <select value={FINANCIAL_PAYMENT_METHODS.includes(form.payment_method) ? form.payment_method : 'อื่น ๆ'} onChange={(event) => {
                if (event.target.value === 'อื่น ๆ') {
                  setPaymentMode('custom');
                  update('payment_method', '');
                } else {
                  update('payment_method', event.target.value);
                }
              }} className="mt-2 min-h-16 w-full rounded-lg border border-slate-300 bg-white px-5 text-xl text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                {FINANCIAL_PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
            ) : (
              <input value={form.payment_method || ''} onChange={(event) => update('payment_method', event.target.value)} className="mt-2 min-h-16 w-full rounded-lg border border-slate-300 bg-white px-5 text-xl text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="กรอกช่องทางเอง" />
            )}
            <button className="mt-2 min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-lg font-bold text-blue-700 hover:bg-blue-50" type="button" onClick={() => setPaymentMode(paymentMode === 'select' ? 'custom' : 'select')}>
              {paymentMode === 'select' ? 'กรอกเอง' : 'เลือกจากรายการ'}
            </button>
          </label>
          <label className="block md:col-span-2">
            <span className="text-xl font-extrabold text-slate-800">รายละเอียด</span>
            <textarea value={form.description || ''} onChange={(event) => update('description', event.target.value)} className="mt-2 min-h-32 w-full rounded-lg border border-slate-300 bg-white px-5 py-4 text-xl text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
          </label>
          <Field label="จำนวนเงิน" type="number" value={form.amount} onChange={(value) => update('amount', value)} />
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-xl font-extrabold text-slate-700 hover:bg-slate-50" onClick={onClose} type="button"><X className="h-6 w-6" />ยกเลิก</button>
          <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 text-xl font-extrabold text-white shadow-sm hover:bg-blue-800" type="submit"><Save className="h-6 w-6" />{saving ? 'กำลังบันทึก' : 'บันทึก'}</button>
        </div>
      </form>
    </div>
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
          {vehicleImages(vehicle).length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {vehicleImages(vehicle).map((image, index) => (
                <div key={`${image}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <img className="max-h-[320px] w-full rounded-xl bg-white object-contain" src={image} alt={`รูปใบเสร็จหรือรูปประกอบรถ ${index + 1}`} />
                  <a className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-lg bg-blue-700 px-4 text-lg font-extrabold text-white hover:bg-blue-800" href={image} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-5 w-5" />
                    เปิดดูรูป {index + 1}
                  </a>
                </div>
              ))}
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
