'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Download,
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
  UserCheck,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';

const API_URL = '/api/vehicles';
const FINANCIAL_API_URL = '/api/financial-transactions';
const STOCK_CATEGORIES_API_URL = '/api/stock/categories';
const STOCK_PRODUCTS_API_URL = '/api/stock/products';
const STOCK_MOVEMENTS_API_URL = '/api/stock/movements';
const EMPLOYEES_API_URL = '/api/employees';
const EMPLOYEE_PHOTO_UPLOAD_API_URL = '/api/employees/upload-photo';
const EMPLOYEE_POSITIONS_API_URL = '/api/employee-positions';
const EMPLOYEE_ATTENDANCE_API_URL = '/api/employee-attendance';
const EMPLOYEE_LEAVES_API_URL = '/api/employee-leaves';
const ATTENDANCE_SETTINGS_API_URL = '/api/attendance-settings';
const AUDIT_LOGS_API_URL = '/api/audit-logs';
const SHIFT_LOGS_STORAGE_KEY = 'jbm_shift_logs_v1';
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
  'BMW',
  'Mercedes-Benz',
  'MINI',
  'Porsche',
  'Audi',
  'Volvo',
  'Lamborghini',
  'อื่นๆ',
];
const MODEL_OPTIONS = {
  BMW: ['Series 3', 'Series 5', 'Series 7', 'X1', 'X3', 'X5', 'X6', 'Z4', 'M3', 'M5', 'iX', 'อื่นๆ'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'GLS', 'G-Class', 'V-Class', 'อื่นๆ'],
  MINI: ['3 Door', '5 Door', 'Countryman', 'Clubman', 'JCW', 'Electric', 'อื่นๆ'],
  Porsche: ['911', 'Macan', 'Cayenne', 'Panamera', 'Taycan', '718', 'อื่นๆ'],
  Audi: ['A4', 'A5', 'A6', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'อื่นๆ'],
  Volvo: ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'EX30', 'อื่นๆ'],
  Lamborghini: ['Huracan', 'Aventador', 'Urus', 'Revuelto', 'อื่นๆ'],
};
const OTHER_OPTION = 'อื่นๆ';
const BASE_YEAR = 2023;
const CURRENT_YEAR = new Date().getFullYear();
const REPORT_YEARS = Array.from({ length: CURRENT_YEAR + 10 - BASE_YEAR + 1 }, (_, index) => BASE_YEAR + index);
const REPORT_YEAR_RANGE_LABEL = `${BASE_YEAR + 543}-${CURRENT_YEAR + 10 + 543}`;
const DEFAULT_SHIFT_EMPLOYEES = ['JBM Admin', 'ช่างประจำอู่', 'ฝ่ายสต็อก', 'ฝ่ายบัญชี'];
const SHIFT_TYPES = ['เวรปกติ', 'เวร OT', 'เวรพิเศษ'];
const EMPLOYEE_STATUSES = ['ทำงานอยู่', 'พักงาน', 'ลาออก'];
const DEFAULT_EMPLOYEE_POSITIONS = ['เจ้าของอู่', 'ผู้จัดการ', 'พนักงานบัญชี', 'พนักงานสต๊อก', 'ช่าง'];
const OTHER_EMPLOYEE_POSITION = 'อื่นๆ';
const ATTENDANCE_STATUS_KEYS = ['มาทำงาน', 'สายเช้า', 'สายบ่าย', 'สายเช้า+บ่าย', 'ขาดงาน', 'ลาป่วย', 'ลากิจ', 'ลาพักร้อน'];
const LEAVE_TYPES = ['ลาป่วย', 'ลากิจ', 'ลาพักร้อน'];
const DEFAULT_ATTENDANCE_SETTINGS = {
  morningStart: '09:00',
  morningLateAfter: '09:06',
  lunchOut: '12:30',
  afternoonStart: '13:30',
  afternoonLateAfter: '13:31',
  workEnd: '18:00',
};
const EMPLOYEE_STATUS_THEME = {
  'ทำงานอยู่': {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
    card: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  'พักงาน': {
    badge: 'border-orange-200 bg-orange-50 text-orange-800',
    dot: 'bg-orange-500',
    card: 'border-orange-200 bg-orange-50 text-orange-800',
  },
  'ลาออก': {
    badge: 'border-rose-200 bg-rose-50 text-rose-800',
    dot: 'bg-rose-500',
    card: 'border-rose-200 bg-rose-50 text-rose-800',
  },
};
const ATTENDANCE_STATUS_THEME = {
  'มาทำงาน': {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
    card: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  'สายเช้า': {
    badge: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    dot: 'bg-yellow-500',
    card: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  },
  'สาย': {
    badge: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    dot: 'bg-yellow-500',
    card: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  },
  'สายบ่าย': {
    badge: 'border-orange-200 bg-orange-50 text-orange-800',
    dot: 'bg-orange-500',
    card: 'border-orange-200 bg-orange-50 text-orange-800',
  },
  'สายเช้า+บ่าย': {
    badge: 'border-pink-200 bg-pink-50 text-pink-800',
    dot: 'bg-pink-500',
    card: 'border-pink-200 bg-pink-50 text-pink-800',
  },
  'ขาดงาน': {
    badge: 'border-rose-200 bg-rose-50 text-rose-800',
    dot: 'bg-rose-500',
    card: 'border-rose-200 bg-rose-50 text-rose-800',
  },
  'ลา': {
    badge: 'border-blue-200 bg-blue-50 text-blue-800',
    dot: 'bg-blue-500',
    card: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  'ลาป่วย': {
    badge: 'border-blue-200 bg-blue-50 text-blue-800',
    dot: 'bg-blue-500',
    card: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  'ลากิจ': {
    badge: 'border-violet-200 bg-violet-50 text-violet-800',
    dot: 'bg-violet-500',
    card: 'border-violet-200 bg-violet-50 text-violet-800',
  },
  'ลาพักร้อน': {
    badge: 'border-sky-200 bg-sky-50 text-sky-800',
    dot: 'bg-sky-500',
    card: 'border-sky-200 bg-sky-50 text-sky-800',
  },
};
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
  'จองคิว': {
    card: 'border-pink-200 bg-pink-50 text-pink-800',
    badge: 'border-pink-200 bg-pink-50 text-pink-800',
    button: 'border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100',
    chart: '#db2777',
  },
  'กำลังตรวจเช็ค': {
    card: 'border-sky-200 bg-sky-50 text-sky-800',
    badge: 'border-sky-200 bg-sky-50 text-sky-800',
    button: 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100',
    chart: '#0284c7',
  },
  'รออะไหล่': {
    card: 'border-orange-200 bg-orange-50 text-orange-800',
    badge: 'border-orange-200 bg-orange-50 text-orange-800',
    button: 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100',
    chart: '#ea580c',
  },
  'กำลังซ่อม': {
    card: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    badge: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    button: 'border-yellow-200 bg-yellow-50 text-yellow-900 hover:bg-yellow-100',
    chart: '#ca8a04',
  },
  'ซ่อมเสร็จรอส่ง': {
    card: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    button: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    chart: '#059669',
  },
  'ปิดงาน': {
    card: 'border-purple-200 bg-purple-50 text-purple-800',
    badge: 'border-purple-200 bg-purple-50 text-purple-800',
    button: 'border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100',
    chart: '#7e22ce',
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
  entryDate: '',
  estimatedCompletion: '',
  bookingTime: '',
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
const EMPLOYEES_STORAGE_KEY = 'jbm-employees-v1';
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

function calculateShiftHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = String(startTime).split(':').map(Number);
  const [endHour, endMinute] = String(endTime).split(':').map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return 0;
  const startTotal = (startHour * 60) + startMinute;
  let endTotal = (endHour * 60) + endMinute;
  if (endTotal < startTotal) endTotal += 24 * 60;
  return Number(((endTotal - startTotal) / 60).toFixed(2));
}

function readStorageArray(key, fallback = []) {
  if (typeof window === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeStorageArray(key, rows) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.isArray(rows) ? rows : []));
  } catch (error) {
    console.error('[storage] write failed', key, error);
  }
}

async function readApiError(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  const error = new Error(data?.error || fallbackMessage || response.statusText || 'Request failed');
  error.status = response.status;
  return error;
}

function canFallbackToLocalStorage(error) {
  if (!error?.status) return true;
  return [500, 502, 503, 504].includes(Number(error.status));
}

function normalizeAttendanceSettings(settings = {}) {
  return {
    ...DEFAULT_ATTENDANCE_SETTINGS,
    ...Object.fromEntries(Object.entries(settings || {}).map(([key, value]) => [key, normalizeTimeInput(value)])),
  };
}

function normalizeEmployee(employee = {}) {
  const photoUrl = employee.photo_url || employee.photoUrl || '';
  return {
    id: employee.id || `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    code: String(employee.code || '').trim(),
    status: EMPLOYEE_STATUSES.includes(employee.status) ? employee.status : EMPLOYEE_STATUSES[0],
    firstName: String(employee.firstName || '').trim(),
    lastName: String(employee.lastName || '').trim(),
    nickname: String(employee.nickname || '').trim(),
    position: String(employee.position || DEFAULT_EMPLOYEE_POSITIONS[DEFAULT_EMPLOYEE_POSITIONS.length - 1]).trim(),
    phone: String(employee.phone || '').trim(),
    startDate: String(employee.startDate || '').slice(0, 10),
    note: String(employee.note || ''),
    photo_url: photoUrl,
    photoUrl,
  };
}

function auditSafeData(value) {
  if (value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function currentAuditActor() {
  if (typeof window === 'undefined') return { actorName: 'System', actorRole: 'owner' };
  try {
    const storedAdmin = window.__JBM_ADMIN_PROFILE__ || null;
    if (storedAdmin?.displayName || storedAdmin?.username) {
      return {
        actorName: storedAdmin.displayName || storedAdmin.username,
        actorRole: storedAdmin.role || 'Admin',
      };
    }
    return { actorName: 'System', actorRole: 'Owner' };
  } catch (error) {
    console.error('[audit] resolve actor failed', error);
    return { actorName: 'System', actorRole: 'Owner' };
  }
}

function addAuditLog(entry = {}) {
  if (typeof window === 'undefined') return;
  try {
    const actor = currentAuditActor();
    const nextEntry = {
      id: entry.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actorName: String(entry.actorName || actor.actorName || 'System').trim() || 'System',
      actorRole: String(entry.actorRole || actor.actorRole || 'Owner').trim() || 'Owner',
      action: String(entry.action || '').trim().toUpperCase() || 'UPDATE',
      module: String(entry.module || '').trim().toUpperCase() || 'SYSTEM',
      targetId: String(entry.targetId || '').trim(),
      targetLabel: String(entry.targetLabel || '').trim(),
      beforeData: auditSafeData(entry.beforeData),
      afterData: auditSafeData(entry.afterData),
      createdAt: entry.createdAt || new Date().toISOString(),
    };
    fetch(AUDIT_LOGS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: nextEntry.id,
        action: nextEntry.action,
        module: nextEntry.module,
        entityType: nextEntry.module,
        entityId: nextEntry.targetId,
        createdBy: nextEntry.actorName,
        detail: nextEntry,
      }),
    }).catch((error) => {
      console.error('[audit] sync failed', error);
    });
  } catch (error) {
    console.error('[audit] addAuditLog failed', error);
  }
}

function employeeFullName(employee = {}) {
  return `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '-';
}

function employeeInitials(employee = {}) {
  const first = String(employee.firstName || employee.nickname || employee.code || '').trim().charAt(0);
  const last = String(employee.lastName || '').trim().charAt(0);
  return `${first}${last}`.trim().toUpperCase() || 'JB';
}

function EmployeeAvatar({ employee, size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-10 w-10 text-sm',
    md: 'h-16 w-16 text-xl',
    lg: 'h-24 w-24 text-3xl',
  };
  const sizeClass = sizes[size] || sizes.md;
  const photoUrl = employee?.photo_url || employee?.photoUrl || '';
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`รูปพนักงาน ${employeeFullName(employee)}`}
        className={`${sizeClass} shrink-0 rounded-full border border-slate-200 bg-slate-100 object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  return (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 font-extrabold text-blue-800 ${className}`}>
      {employeeInitials(employee)}
    </div>
  );
}

function minutesFromTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return (hour * 60) + minute;
}

function timeText(value) {
  const minutes = minutesFromTime(String(value || '').slice(0, 5));
  if (minutes === null) return '-';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function normalizeTimeInput(value) {
  const cleaned = String(value || '').replace(/[^\d:]/g, '');
  if (!cleaned) return '';
  if (cleaned.includes(':')) {
    const [rawHour = '', rawMinute = ''] = cleaned.split(':');
    const hour = rawHour.replace(/\D/g, '').slice(0, 2);
    const minute = rawMinute.replace(/\D/g, '').slice(0, 2);
    let normalized = hour;
    if (cleaned.includes(':')) normalized += ':';
    if (minute) normalized += minute;
    if (/^\d{1,2}:\d{2}$/.test(normalized) && minutesFromTime(normalized) !== null) return timeText(normalized);
    return normalized.slice(0, 5);
  }

  const digits = cleaned.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  if (digits.length === 3) return `${digits.slice(0, 1).padStart(2, '0')}:${digits.slice(1)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

function finalizeTimeInput(value) {
  const normalized = normalizeTimeInput(value);
  if (!normalized) return '';
  if (/^\d{1,2}$/.test(normalized)) {
    const withMinutes = `${normalized.padStart(2, '0')}:00`;
    return minutesFromTime(withMinutes) !== null ? withMinutes : normalized;
  }
  if (/^\d{1,2}:\d{2}$/.test(normalized) && minutesFromTime(normalized) !== null) return timeText(normalized);
  return normalized;
}

function isValidTimeValue(value) {
  return minutesFromTime(String(value || '').trim()) !== null;
}

function validateTimeFields(fields) {
  const invalid = fields.find(([_, value]) => !isValidTimeValue(value));
  if (invalid) return `รูปแบบเวลาไม่ถูกต้อง: ${invalid[0]}`;
  return '';
}

function isAttendanceAutoMode(method) {
  return !method || method === 'auto';
}

function calculateAttendanceStatus(method, morningIn, afternoonIn, settings = DEFAULT_ATTENDANCE_SETTINGS) {
  if (method && method !== 'auto') {
    if (method === 'present') return 'มาทำงาน';
    if (method === 'late') return 'สาย';
    if (method === 'leave') return 'ลา';
    if (method === 'absent') return 'ขาดงาน';
    return method;
  }
  const morningMinutes = minutesFromTime(morningIn);
  const afternoonMinutes = minutesFromTime(afternoonIn);
  const lateMorningAfter = minutesFromTime(settings.morningLateAfter);
  const lateAfternoonAfter = minutesFromTime(settings.afternoonLateAfter);
  const lateMorning = morningMinutes !== null && lateMorningAfter !== null && morningMinutes >= lateMorningAfter;
  const lateAfternoon = afternoonMinutes !== null && lateAfternoonAfter !== null && afternoonMinutes >= lateAfternoonAfter;
  if (lateMorning && lateAfternoon) return 'สายเช้า+บ่าย';
  if (lateMorning) return 'สายเช้า';
  if (lateAfternoon) return 'สายบ่าย';
  return 'มาทำงาน';
}

function calculateWorkHours(morningIn, lunchOut, afternoonIn, eveningOut) {
  const start = minutesFromTime(morningIn);
  const lunch = minutesFromTime(lunchOut);
  const afternoon = minutesFromTime(afternoonIn);
  const end = minutesFromTime(eveningOut);
  if ([start, lunch, afternoon, end].some((value) => value === null)) return 0;
  if (end <= start || afternoon < lunch) return 0;
  const breakMinutes = afternoon - lunch;
  const total = end - start - breakMinutes;
  return total > 0 ? Number((total / 60).toFixed(2)) : 0;
}

function countLeaveDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate || startDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

function daysInDateRange(startDate, endDate) {
  const count = countLeaveDays(startDate, endDate);
  if (!count) return [];
  return Array.from({ length: count }, (_, index) => addDays(startDate, index));
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
  const entryDate = vehicle.entryDate || vehicle.booking_date || '';
  const estimatedCompletion = vehicle.estimatedCompletion || vehicle.estimated_completion_date || '';
  return {
    ...emptyVehicle,
    ...vehicle,
    entryDate: String(entryDate || '').slice(0, 10),
    estimatedCompletion: String(estimatedCompletion || '').slice(0, 10),
    booking_date: String(entryDate || '').slice(0, 10),
    estimated_completion_date: String(estimatedCompletion || '').slice(0, 10),
    booking_time: vehicle.booking_time || vehicle.bookingTime || '',
    bookingTime: vehicle.bookingTime || vehicle.booking_time || '',
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
  const actor = currentAuditActor();
  return {
    id: `stock-move-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    product_id: product.id,
    code: product.code,
    name: product.name,
    type,
    quantity: change,
    quantity_change: change,
    quantity_before: before,
    quantity_after: after,
    created_by: actor.actorName,
    note,
  };
}

function normalizeStockMovement(movement = {}) {
  const quantityChange = movement.quantity_change ?? movement.quantity ?? 0;
  return {
    ...movement,
    id: movement.id || `stock-move-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    product_id: movement.product_id || movement.productId || '',
    code: movement.code || movement.product_code || '',
    name: movement.name || movement.product_name || '',
    type: movement.type || movement.movement_type || '',
    quantity_change: Number(quantityChange || 0),
    quantity_before: Number(movement.quantity_before || 0),
    quantity_after: Number(movement.quantity_after || 0),
    created_at: movement.created_at || '',
    created_by: movement.created_by || movement.createdBy || '',
    note: movement.note || '',
  };
}

function stockMovementRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.movements)) return data.movements;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function validDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function vehicleImages(vehicle = {}) {
  return Array.from(new Set([
    ...(Array.isArray(vehicle.receipt_images) ? vehicle.receipt_images : []),
    vehicle.receipt_image,
  ].filter(Boolean)));
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(filename, columns, rows) {
  if (typeof window === 'undefined') return;
  const header = columns.map((column) => csvCell(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => csvCell(row[column.key])).join(',')).join('\n');
  const csv = `\uFEFF${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function filterSegment(value, fallback = 'all') {
  return String(value || fallback).replace(/[^\w-]+/g, '-');
}

function normalizeAdminIdentity(value) {
  return String(value || '').trim().toLowerCase();
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
  const navLinkClass = admin
    ? 'inline-flex min-h-11 items-center rounded-lg px-3 text-base font-extrabold text-slate-700 hover:bg-slate-100 sm:px-4 sm:text-lg'
    : 'inline-flex min-h-11 w-full items-center justify-center rounded-lg px-3 text-base font-extrabold text-slate-700 hover:bg-slate-100 sm:w-auto sm:px-4 sm:text-lg';

  const publicNav = [
    { href: '/', label: 'หน้าแรก' },
    { href: '/#about', label: 'เกี่ยวกับร้าน' },
    { href: '/status', label: 'เช็คสถานะ', icon: Search },
    { href: '/admin', label: 'เข้าสู่ระบบ', special: true },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className={`${admin ? 'flex min-h-16 items-center justify-between' : 'flex flex-col py-3 sm:min-h-16 sm:flex-row sm:items-center sm:justify-between sm:py-0'} mx-auto max-w-7xl gap-3 px-4 sm:px-6 lg:px-8`}>
        <Link href="/" className="flex min-w-fit items-center gap-3">
          <img src="/images/jbm-public/jbmlogo.webp" className="h-12 w-12 rounded-lg object-cover" alt="JBM PRO AUTO Logo" />
          <div className="min-w-fit">
            <p className="whitespace-nowrap text-xl font-extrabold leading-tight text-slate-950">JBM PRO AUTO</p>
          </div>
        </Link>
        <nav className={admin ? 'flex min-w-0 items-center gap-1 overflow-x-auto sm:gap-2' : 'grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-none sm:flex sm:items-center'}>
          {publicNav.map((item) => {
            if (item.special) {
              return (
                <Link
                  key={item.href}
                  className={admin ? 'inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-3 text-base font-extrabold text-white sm:px-4 sm:text-lg' : navLinkClass}
                  href={item.href}
                >
                  {item.label}
                </Link>
              );
            }
            const Icon = item.icon;
            return (
              <Link key={item.href} className={`${navLinkClass} ${Icon ? 'gap-2' : ''}`} href={item.href}>
                {Icon && <Icon className="h-5 w-5" />}
                {item.label}
              </Link>
            );
          })}
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
      setError('กรุณากรอกข้อมูลสำหรับค้นหาสถานะงานซ่อม');
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
      setError(vehicle ? '' : 'ไม่พบข้อมูลรถจากคำค้นหานี้ กรุณาตรวจสอบความถูกต้องและลองใหม่อีกครั้ง');
    } catch {
      setResult(null);
      setError('ระบบค้นหายังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20">
            <Search className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold text-slate-950 sm:text-3xl">เช็คสถานะงานซ่อมรถ</h2>
            <p className="mt-1.5 text-base font-semibold leading-relaxed text-slate-500">กรอกข้อมูลสำหรับค้นหา เพื่อตรวจสอบขั้นตอนการทำงานล่าสุด</p>
          </div>
        </div>
        
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-14 w-full rounded-xl border border-slate-300 bg-white pl-4 pr-4 text-lg font-bold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400 sm:min-h-16 sm:px-5 sm:text-xl"
              placeholder="กรอกข้อมูลค้นหาสถานะ"
            />
          </div>
          <button className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 px-8 text-lg font-extrabold text-white hover:from-blue-600 hover:to-blue-700 transition-all-300 hover:scale-[1.02] active:scale-[0.98] sm:min-h-16 lg:w-auto shadow-lg shadow-blue-900/10" type="submit">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                กำลังค้นหา...
              </span>
            ) : (
              <>
                <Search className="h-5 w-5 stroke-[2.5]" />
                ค้นหาข้อมูล
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-5 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-rose-800">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-200 text-rose-800 text-sm font-bold">!</div>
            <p className="text-base font-bold leading-relaxed">{error}</p>
          </div>
        )}
      </div>

      {result && (
        <div className="mx-auto mt-8 w-full max-w-3xl space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6">
            <p className="text-sm font-bold text-slate-500">สถานะปัจจุบัน</p>
            <div className="mt-2 flex justify-center">
              <StatusPill status={result.status} />
            </div>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">หากต้องการรายละเอียดเพิ่มเติม กรุณาติดต่อ JBM PRO AUTO</p>
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
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
      <h3 className="text-xl font-extrabold text-slate-950 mb-6">ขั้นตอนการทำงาน</h3>
      <div className="space-y-4">
        {STATUS_OPTIONS.map((item, index) => {
          const active = index === activeIndex;
          const done = index < activeIndex;
          return (
            <div key={item} className="grid grid-cols-[auto_1fr] gap-4">
              <div className="flex flex-col items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-base font-extrabold transition-all duration-300 ${active ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20' : done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-slate-400'}`}>
                  {done ? '✓' : index + 1}
                </div>
                {index < STATUS_OPTIONS.length - 1 && (
                  <div className={`h-10 w-[2px] ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </div>
              <div className={`min-h-10 rounded-2xl border px-4 py-3 transition-all duration-300 ${active ? 'border-blue-200 bg-blue-50/50 text-blue-900 shadow-sm' : done ? 'border-emerald-100 bg-emerald-50/30 text-emerald-800' : 'border-slate-100 bg-slate-50/50 text-slate-400'}`}>
                <p className="text-base sm:text-lg font-extrabold">{item}</p>
                {active && <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mt-0.5">สถานะปัจจุบัน</span>}
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
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="break-words text-base font-extrabold text-slate-900 mt-1 sm:text-lg">{value}</p>
    </div>
  );
}

function HomePage() {
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };
    if (selectedImage) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImage]);

  const serviceGuides = [
    { src: '/images/jbm-public/jbmaa.webp', title: 'Service A', desc: '', alt: 'Service A JBM PRO AUTO' },
    { src: '/images/jbm-public/jbmbb.webp', title: 'Service B', desc: '', alt: 'Service B JBM PRO AUTO' },
    { src: '/images/jbm-public/BenzService.webp', title: 'Service A / B', desc: '', alt: 'Service A / B JBM PRO AUTO' },
    { src: '/images/jbm-public/ServiceBMW.webp', title: 'BMW Service', desc: '', alt: 'BMW service guide at JBM PRO AUTO' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Header />
      <main>
        {/* Hero Section */}
        <section
          className="relative min-h-[580px] overflow-hidden bg-slate-950 sm:min-h-[660px] lg:min-h-[calc(100vh-4rem)] flex items-center"
          style={{
            backgroundImage:
              "linear-gradient(105deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.85) 45%, rgba(15,23,42,0.4) 100%), url('/images/jbm-public/cover.webp')",
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        >
          {/* Subtle gold decoration bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-amber-400 to-red-600" />
          
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-4xl space-y-6 text-white">
              <h1 className="max-w-5xl text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl text-white">
                ศูนย์บริการ <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-200">Service รถยุโรป</span> ครบวงจร
                <span className="mt-3 block text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-300">จำหน่ายและติดตั้งอะไหล่คุณภาพ จัดส่งทั่วไทย</span>
              </h1>
              <p className="max-w-2xl text-base sm:text-lg text-slate-400 leading-relaxed">
                ดูแลรถยุโรปคู่ใจของคุณโดยช่างผู้เชี่ยวชาญเฉพาะทาง พร้อมเครื่องมือตรวจวิเคราะห์อาการที่ตรงจุด ทันสมัย และใช้อะไหล่แท้เพื่อให้คุณมั่นใจในทุกการเดินทาง
              </p>

              <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                <Link className="inline-flex min-h-14 w-full items-center justify-center gap-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-8 text-lg font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-yellow-300 hover:to-amber-400 transition-all-300 hover:scale-[1.03] active:scale-[0.98] sm:w-auto glow-accent" href="/status">
                  <Search className="h-5 w-5 stroke-[2.5]" />
                  ตรวจสอบสถานะรถของคุณ
                </Link>
                <a className="inline-flex min-h-14 w-full items-center justify-center gap-3.5 rounded-xl bg-slate-900 border border-slate-800 px-8 text-lg font-extrabold text-white hover:bg-slate-800 transition-all-300 hover:scale-[1.03] active:scale-[0.98] sm:w-auto" href="#about">
                  ทำความรู้จักเรา
                </a>
              </div>

              {/* Responsive contact info highlights */}
              <div className="grid max-w-4xl gap-4 pt-8 border-t border-slate-800/80 sm:grid-cols-3">
                <div className="border-l-4 border-amber-400 pl-4 py-1 transition-all duration-300 hover:border-blue-500">
                  <p className="break-words text-xl font-extrabold tracking-wide text-white lg:text-2xl">616 1B</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-400">ซอยพัฒนาการ 30 สวนหลวง</p>
                </div>
                <div className="border-l-4 border-amber-400 pl-4 py-1 transition-all duration-300 hover:border-blue-500">
                  <p className="break-words text-xl font-extrabold tracking-wide text-white lg:text-2xl">099 265 1133</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-400">โทรติดต่อหรือจองคิวซ่อม</p>
                </div>
                <div className="border-l-4 border-amber-400 pl-4 py-1 transition-all duration-300 hover:border-blue-500">
                  <p className="break-words text-xl font-extrabold tracking-wide text-white lg:text-2xl">09:30 - 18:00</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-400">เปิดให้บริการ วันจันทร์ - เสาร์</p>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* Search Status Embedded Section */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-center">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-extrabold text-blue-700">
                  Real-time Status Tracking
                </span>
                <h2 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
                  ติดตามทุกความคืบหน้าของรถยนต์คุณได้ง่าย ๆ ตลอด 24 ชม.
                </h2>
                <div 
                  className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-lg transition duration-300 hover:shadow-xl relative cursor-pointer aspect-[16/10] flex items-center justify-center"
                  onClick={() => setSelectedImage({ src: '/images/jbm-public/ccc.webp', title: 'บรรยากาศอู่ซ่อมรถยุโรป JBM PRO AUTO', alt: 'บรรยากาศอู่ซ่อมรถยุโรป JBM PRO AUTO' })}
                >
                  <img className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src="/images/jbm-public/ccc.webp" alt="บรรยากาศอู่ซ่อมรถยุโรป JBM PRO AUTO" loading="lazy" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                    <span className="text-white text-xs bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm font-bold flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> คลิกเพื่อดูรูปขยาย
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-1 shadow-lg backdrop-blur">
                <div className="bg-white rounded-[20px] p-6 sm:p-8">
                  <CustomerSearch />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="bg-slate-900 text-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="space-y-6">
                <span className="text-sm font-extrabold tracking-wider uppercase text-amber-400">About JBM PRO AUTO</span>
                <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl text-white">
                  ผู้เชี่ยวชาญการซ่อมบำรุงรถยุโรป ด้วยประสบการณ์และมาตรฐานสากล
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                  JBM PRO AUTO คือศูนย์บริการซ่อมบำรุงรถยนต์ยุโรปครบวงจร (BMW, Mercedes-Benz, Porsche, MINI, Audi, Volvo, และรถยุโรปชั้นนำ) เราตั้งใจมอบการบริการที่มีคุณภาพเทียบเท่าห้างจำหน่ายในราคาที่เป็นมิตร ด้วยเครื่องมือเฉพาะทางระดับมืออาชีพ
                </p>
                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mt-1">
                      <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                    </div>
                    <p className="text-slate-300 font-medium">ทีมช่างผู้ชำนาญการที่มีประสบการณ์ดูแลซ่อมแซมแบรนด์รถหรูโดยเฉพาะ</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mt-1">
                      <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                    </div>
                    <p className="text-slate-300 font-medium">วิเคราะห์หาสาเหตุของปัญหาด้วยคอมพิวเตอร์และโปรแกรมลิขสิทธิ์ของรถแต่ละรุ่น</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mt-1">
                      <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                    </div>
                    <p className="text-slate-300 font-medium">สต็อกอะไหล่สำรองแท้และเทียบคุณภาพสูง เพื่อการบริการที่รวดเร็วและคุ้มค่าที่สุด</p>
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-800 shadow-2xl">
                <img className="aspect-[16/10] h-auto w-full object-cover transition-transform duration-700 hover:scale-105" src="/images/jbm-public/cover.webp" alt="ศูนย์บริการรถยุโรป JBM PRO AUTO" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end p-6">
                  <p className="text-sm font-bold text-slate-300">JBM PRO AUTO - พัฒนาการ 30</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Guide */}
        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center max-w-3xl mx-auto">
              <p className="text-base font-bold uppercase tracking-wider text-blue-600">Maintenance Services</p>
              <h2 className="mt-2 text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
                ความแตกต่างของงานเช็กระยะและบริการซ่อมบำรุง
              </h2>
              <p className="mt-3 text-slate-600 text-base sm:text-lg">
                เข้าใจรายละเอียดการบำรุงรักษาพื้นฐานตามช่วงเวลา เพื่อการวางแผนดูแลรักษารถยนต์อย่างมีประสิทธิภาพ
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {serviceGuides.map(({ src, title, desc, alt }) => (
                <article key={src} className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col">
                  <div 
                    className="overflow-hidden aspect-[16/9] relative cursor-pointer bg-slate-100 flex items-center justify-center"
                    onClick={() => setSelectedImage({ src, title, alt })}
                  >
                    <img className="h-full w-full object-contain transition duration-500 group-hover:scale-105" src={src} alt={alt} loading="lazy" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                      <span className="text-white text-xs bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm font-bold flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> คลิกเพื่อดูรูปขยาย
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between text-center">
                    <div>
                      <h3 className="text-[15px] font-extrabold text-slate-950 text-center">{title}</h3>
                      {desc && <p className="mt-2 text-sm text-slate-600 leading-relaxed font-bold text-center">{desc}</p>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Contact CTA & Map */}
        <section className="bg-gradient-to-br from-slate-900 to-blue-950 py-16 text-white relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:items-center">
            <div className="space-y-6">
              <span className="text-sm font-extrabold tracking-wider uppercase text-yellow-400">Get In Touch</span>
              <h2 className="text-3xl font-extrabold sm:text-4xl">ติดต่อเราเพื่อขอรับบริการหรือจองคิว</h2>
              <p className="text-slate-300 text-lg leading-relaxed max-w-xl">
                หากคุณมีข้อสงสัยเกี่ยวกับงานซ่อม ต้องการประเมินราคาเบื้องต้น หรือต้องการจองคิวซ่อมบำรุง สามารถติดต่อทีมงาน JBM PRO AUTO ผ่านช่องทางต่างๆ ด้านล่างนี้ได้ทันที
              </p>
              
              <div className="space-y-4 text-base sm:text-lg leading-7 text-slate-200 pt-2">
                <p className="flex gap-4 items-start">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-yellow-300 stroke-[2]" />
                  <span>616 1B ซอยพัฒนาการ 30 สวนหลวง เขตสวนหลวง กรุงเทพมหานคร 10250</span>
                </p>
                <p className="flex gap-4 items-center">
                  <Phone className="h-5 w-5 shrink-0 text-yellow-300 stroke-[2]" />
                  <a href="tel:0992651133" className="hover:text-yellow-300 transition-colors">099 265 1133</a>
                </p>
                <p className="flex gap-4 items-start">
                  <Clock className="mt-1 h-5 w-5 shrink-0 text-yellow-300 stroke-[2]" />
                  <span>วันจันทร์ - วันเสาร์: 9:30 - 18:00 น.<br /><span className="text-red-400 text-sm font-semibold">วันอาทิตย์: ปิดทำการ</span></span>
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-3">
                <a className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 text-base font-extrabold text-white transition-all-300 hover:scale-[1.03] active:scale-[0.97]" href="https://line.me/R/ti/p/@JBMPRO" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5" />
                  LINE: @JBMPRO
                </a>
                <a className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 text-base font-extrabold text-white transition-all-300 hover:scale-[1.03] active:scale-[0.97]" href="https://www.facebook.com/jbmproauto?locale=th_TH" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-5 w-5" />
                  Facebook Page
                </a>
                <a className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-pink-600 hover:bg-pink-500 px-5 text-base font-extrabold text-white transition-all-300 hover:scale-[1.03] active:scale-[0.97]" href="https://www.instagram.com/jbm.pro.auto/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-5 w-5" />
                  Instagram
                </a>
              </div>
            </div>

            {/* Google Maps Container */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-800/80 shadow-2xl p-1.5">
              <div className="overflow-hidden rounded-xl bg-slate-900">
                <iframe
                  className="h-[340px] w-full border-0 sm:h-[380px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src="https://www.google.com/maps?q=JBM%20PRO%20AUTO%20616%201B%20%E0%B8%8B%E0%B8%AD%E0%B8%A2%20%E0%B8%9E%E0%B8%B1%E0%B8%92%E0%B8%99%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%A3%2030%20%E0%B8%AA%E0%B8%A7%E0%B8%99%E0%B8%AB%E0%B8%A5%E0%B8%A7%E0%B8%87%20%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B8%A3&output=embed"
                  title="แผนที่ JBM PRO AUTO"
                />
              </div>
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-slate-300">เปิดเส้นทางนำทางไปยังศูนย์บริการ</p>
                <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 px-5 text-sm font-extrabold text-slate-950 transition-colors" href="https://maps.app.goo.gl/R3Hh4ZxD7KXkciZt5" target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-4 w-4 stroke-[2]" />
                  เปิด Google Maps
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 transition-opacity duration-300"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-slate-300 focus:outline-none transition bg-black/40 hover:bg-black/60 p-2 rounded-full"
              aria-label="ปิด"
              id="close-lightbox-btn"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Image Container */}
            <div 
              className="relative w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.src}
                alt={selectedImage.alt || 'รูปขยาย'}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              {selectedImage.title && (
                <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 text-center text-white bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-sm text-sm font-bold">
                  {selectedImage.title}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-slate-50">
        <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center space-y-3">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">เช็คสถานะงานซ่อม JBM PRO AUTO</h1>
            </div>
            <CustomerSearch />
          </div>
        </section>
      </main>
    </div>
  );
}


function AdminApp() {
  const [token, setToken] = useState('');
  const [, setAdminProfile] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
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
  const [shiftLogs, setShiftLogs] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(SHIFT_LOGS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [newShiftLog, setNewShiftLog] = useState(() => ({
    employeeName: DEFAULT_SHIFT_EMPLOYEES[0],
    date: dateInputValue(new Date()),
    startTime: '18:00',
    endTime: '22:00',
    shiftType: SHIFT_TYPES[0],
    note: '',
  }));
  const [shiftFilters, setShiftFilters] = useState({ month: 'all', year: String(CURRENT_YEAR), employeeName: 'all' });
  const [stockProducts, setStockProducts] = useState(INITIAL_STOCK_PRODUCTS);
  const [stockCategories, setStockCategories] = useState(INITIAL_STOCK_CATEGORIES);
  const [stockMovements, setStockMovements] = useState(INITIAL_STOCK_MOVEMENTS);
  const [stockMovementError, setStockMovementError] = useState('');
  const activeTab = active;

  const headers = useCallback(() => ({}), []);
  const setActiveTab = useCallback((key) => {
    setActive(key);
    setMobileMenu(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/validate', { method: 'GET', cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (response.ok && data?.authenticated && data?.admin) {
          window.__JBM_ADMIN_PROFILE__ = data.admin;
          setAdminProfile(data.admin);
          setToken('cookie-session');
        } else {
          window.__JBM_ADMIN_PROFILE__ = null;
          setAdminProfile(null);
          setToken('');
        }
      })
      .catch(() => {
        if (cancelled) return;
        window.__JBM_ADMIN_PROFILE__ = null;
        setAdminProfile(null);
        setToken('');
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(() => {
    fetch('/api/admin/logout', { method: 'POST', headers: headers() }).catch(() => {});
    window.__JBM_ADMIN_PROFILE__ = null;
    setToken('');
    setAdminProfile(null);
    setUsernameInput('');
    setPasswordInput('');
    setLoginError('');
    setVehicles([]);
    setActive('dashboard');
    setMobileMenu(false);
  }, [headers]);

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

  const loadStockData = useCallback(async () => {
    if (!token) return;
    try {
      const results = await Promise.allSettled([
        fetch(STOCK_CATEGORIES_API_URL, { headers: headers() }).then(async r => {
          if (!r.ok) throw new Error('categories failed');
          return r.json();
        }),
        fetch(STOCK_PRODUCTS_API_URL, { headers: headers() }).then(async r => {
          if (!r.ok) throw new Error('products failed');
          return r.json();
        }),
        fetch(STOCK_MOVEMENTS_API_URL, { headers: headers() }).then(async r => {
          if (!r.ok) throw new Error(r.status === 403 ? 'กรุณาเข้าสู่ระบบใหม่' : 'โหลดประวัติสต๊อกไม่สำเร็จ');
          return r.json();
        }),
      ]);

      const [catResult, prodResult, moveResult] = results;

      if (catResult.status === 'fulfilled') {
        const nextCategories = (catResult.value.categories || []).map(normalizeStockCategory).filter((category) => category.name);
        setStockCategories(nextCategories);
        writeStorageArray(STOCK_CATEGORIES_STORAGE_KEY, nextCategories);
      } else {
        console.error('[admin] load stock categories failed', catResult.reason);
      }

      if (prodResult.status === 'fulfilled') {
        const nextProducts = (prodResult.value.products || []).map(normalizeStockProduct);
        setStockProducts(nextProducts);
        writeStorageArray(STOCK_PRODUCTS_STORAGE_KEY, nextProducts);
      } else {
        console.error('[admin] load stock products failed', prodResult.reason);
      }

      if (moveResult.status === 'fulfilled') {
        setStockMovementError('');
        const nextMovements = stockMovementRows(moveResult.value)
          .map(normalizeStockMovement)
          .sort((a, b) => (validDateValue(b.created_at)?.getTime() || 0) - (validDateValue(a.created_at)?.getTime() || 0));
        setStockMovements(nextMovements);
        writeStorageArray(STOCK_MOVEMENTS_STORAGE_KEY, nextMovements);
      } else {
        console.error('[admin] load stock movements failed', moveResult.reason);
        setStockMovementError(moveResult.reason?.message || 'โหลดประวัติสต๊อกไม่สำเร็จ');
      }
    } catch (error) {
      console.error('[admin] load stock data failed', error);
    }
  }, [headers, token]);

  useEffect(() => {
    loadStockData();
  }, [loadStockData]);

  useEffect(() => {
    window.localStorage.setItem(SHIFT_LOGS_STORAGE_KEY, JSON.stringify(shiftLogs));
  }, [shiftLogs]);

  const login = async (event) => {
    event.preventDefault();
    if (!usernameInput.trim() || !passwordInput) {
      setLoginError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    setLoginError('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'เข้าสู่ระบบไม่สำเร็จ');
      const nextAdmin = data?.admin || null;
      if (!nextAdmin) throw new Error('เข้าสู่ระบบไม่สำเร็จ');
      window.__JBM_ADMIN_PROFILE__ = nextAdmin;
      setToken('cookie-session');
      setAdminProfile(nextAdmin);
      setUsernameInput('');
      setPasswordInput('');
    } catch (error) {
      setLoginError(error.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const saveVehicle = async (vehicle) => {
    const vehiclePayload = {
      ...vehicle,
      id: vehicle.id || `job-${Date.now()}`,
      booking_date: vehicle.entryDate || vehicle.booking_date || null,
      estimated_completion_date: vehicle.estimatedCompletion || vehicle.estimated_completion_date || null,
    };
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify(vehiclePayload),
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

  const adjustStockQuantity = useCallback(async (id, amount) => {
    const item = stockProducts.find((product) => product.id === id);
    if (!item) return;
    const before = Number(item.quantity || 0);
    const after = Math.max(0, before + amount);
    const change = after - before;
    if (change === 0) return;
    const productResponse = await fetch(STOCK_PRODUCTS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify({ ...item, quantity: after }),
    });
    if (!productResponse.ok) throw new Error('อัปเดตจำนวนสินค้าไม่สำเร็จ');
    const movement = makeStockMovement(item, change > 0 ? 'รับเข้า' : 'เบิกออก', change, before, after, change > 0 ? 'เพิ่มจำนวนจากหน้าสต็อก' : 'ลดจำนวนจากหน้าสต็อก');
    const movementResponse = await fetch(STOCK_MOVEMENTS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify(movement),
    });
    if (!movementResponse.ok) throw new Error('บันทึกประวัติสต็อกไม่สำเร็จ');
    setStockProducts((current) => current.map((product) => (product.id === id ? { ...product, quantity: after } : product)));
    setStockMovements((current) => [movement, ...current]);
    await loadStockData();
  }, [headers, loadStockData, stockProducts]);

  const saveStockProduct = useCallback(async (product) => {
    const normalized = normalizeStockProduct(product);
    const previous = stockProducts.find((item) => item.id === normalized.id);
    const response = await fetch(STOCK_PRODUCTS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify(normalized),
    });
    if (!response.ok) throw new Error('บันทึกสินค้าไม่สำเร็จ');
    const before = Number(previous?.quantity || 0);
    const after = Number(normalized.quantity || 0);
    if (!previous || before !== after) {
      const movement = makeStockMovement(normalized, previous ? 'ปรับยอด' : 'เพิ่มสินค้าใหม่', after - before, before, after, previous ? 'แก้ไขจำนวนจากฟอร์มสินค้า' : 'เพิ่มสินค้าใหม่');
      const movementResponse = await fetch(STOCK_MOVEMENTS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify(movement),
      });
      if (!movementResponse.ok) throw new Error('บันทึกประวัติสต็อกไม่สำเร็จ');
      setStockMovements((current) => [movement, ...current]);
    }
    setStockProducts((current) => [normalized, ...current.filter((item) => item.id !== normalized.id)]);
    await loadStockData();
  }, [headers, loadStockData, stockProducts]);

  const deleteStockProduct = useCallback(async (product) => {
    const movement = makeStockMovement(product, 'ลบสินค้า', -Number(product.quantity || 0), Number(product.quantity || 0), 0, 'ลบรายการสินค้าออกจากสต็อก');
    const movementResponse = await fetch(STOCK_MOVEMENTS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify(movement),
    });
    if (!movementResponse.ok) throw new Error('บันทึกประวัติลบสินค้าไม่สำเร็จ');
    const deleteResponse = await fetch(`${STOCK_PRODUCTS_API_URL}?id=${encodeURIComponent(product.id)}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (!deleteResponse.ok) throw new Error('ลบสินค้าไม่สำเร็จ');
    setStockProducts((current) => current.filter((item) => item.id !== product.id));
    setStockMovements((current) => [movement, ...current]);
    await loadStockData();
  }, [headers, loadStockData]);

  const saveStockCategory = useCallback(async (category) => {
    const normalized = normalizeStockCategory(category);
    if (!normalized.name) return;
    const response = await fetch(STOCK_CATEGORIES_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify(normalized),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || 'บันทึกหมวดหมู่ไม่สำเร็จ');
    await loadStockData();
  }, [headers, loadStockData]);

  const deleteStockCategory = useCallback(async (category) => {
    const response = await fetch(`${STOCK_CATEGORIES_API_URL}?id=${encodeURIComponent(category.id)}`, {
      method: 'DELETE',
      headers: headers(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || 'ลบหมวดหมู่ไม่สำเร็จ');
    await loadStockData();
  }, [headers, loadStockData]);

  const toggleStockCategory = useCallback(async (id) => {
    const currentCategory = stockCategories.find((item) => item.id === id);
    if (!currentCategory) return;
    const response = await fetch(STOCK_CATEGORIES_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify({ ...currentCategory, is_active: !currentCategory.is_active }),
    });
    if (!response.ok) throw new Error('อัปเดตหมวดหมู่ไม่สำเร็จ');
    await loadStockData();
  }, [headers, loadStockData, stockCategories]);

  const clearStockSampleData = useCallback(() => {
    alert('ปิดการล้างข้อมูลสต็อกอัตโนมัติแล้ว กรุณาจัดการผ่านฐานข้อมูลหรือ API ทีละรายการ');
  }, []);

  const activeEmployees = useMemo(() => {
    const names = new Set(DEFAULT_SHIFT_EMPLOYEES);
    shiftLogs.forEach((log) => {
      if (log.employeeName) names.add(log.employeeName);
    });
    return Array.from(names).map((name) => ({ id: name, name }));
  }, [shiftLogs]);

  const shiftHoursPreview = useMemo(() => (
    calculateShiftHours(newShiftLog.startTime, newShiftLog.endTime)
  ), [newShiftLog.endTime, newShiftLog.startTime]);

  const shiftYears = useMemo(() => {
    const years = new Set([String(CURRENT_YEAR)]);
    shiftLogs.forEach((log) => {
      const year = String(log.date || '').slice(0, 4);
      if (/^\d{4}$/.test(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [shiftLogs]);

  const filteredShiftLogs = useMemo(() => {
    return shiftLogs.filter((log) => {
      const date = String(log.date || '');
      if (shiftFilters.month !== 'all' && date.slice(5, 7) !== shiftFilters.month) return false;
      if (shiftFilters.year !== 'all' && !date.startsWith(shiftFilters.year)) return false;
      if (shiftFilters.employeeName !== 'all' && log.employeeName !== shiftFilters.employeeName) return false;
      return true;
    });
  }, [shiftFilters, shiftLogs]);

  const alertCustom = useCallback((message) => {
    if (typeof window !== 'undefined') window.alert(message);
  }, []);

  const handleAddShiftLog = useCallback((event) => {
    event.preventDefault();
    const hours = calculateShiftHours(newShiftLog.startTime, newShiftLog.endTime);
    const nextLog = {
      id: `SHIFT${String(shiftLogs.length + 1).padStart(3, '0')}`,
      employeeName: newShiftLog.employeeName,
      date: newShiftLog.date,
      startTime: newShiftLog.startTime,
      endTime: newShiftLog.endTime,
      shiftType: newShiftLog.shiftType,
      hours,
      note: newShiftLog.note || '-',
    };
    setShiftLogs((current) => [nextLog, ...current]);
    setNewShiftLog((current) => ({ ...current, note: '' }));
    alertCustom(`บันทึกเวรของ ${newShiftLog.employeeName} สำเร็จ (${hours} ชั่วโมง)`);
  }, [alertCustom, newShiftLog, shiftLogs.length]);

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

  const adminNavGroups = [
    {
      group: 'ภาพรวม',
      items: [
        ['dashboard', 'Dashboard', Gauge],
      ]
    },
    {
      group: 'งานซ่อม',
      items: [
        ['form', 'เพิ่มคิว / ลงทะเบียนเคสซ่อม', Plus],
        ['calendar', 'ปฏิทินจองคิว', CalendarDays],
        ['in-shop', 'รถค้างในร้าน', Wrench],
        ['all', 'รถทั้งหมดในระบบ', Car],
      ]
    },
    {
      group: 'จัดการร้าน',
      items: [
        ['productStock', 'สต็อกสินค้า', Package],
        ['finance', 'การเงิน', Coins],
        ['charts', 'รายงาน / กราฟ', ClipboardList],
      ]
    },
    {
      group: 'ระบบพนักงาน',
      items: [
        ['shift-duty', 'จัดการพนักงาน', UserCheck],
      ]
    }
  ];

  if (!token) {
    if (!authChecked) {
      return (
        <div className="min-h-screen bg-slate-50">
          <Header admin />
          <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center px-4 py-10 sm:px-6">
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-lg font-bold text-slate-600 shadow-sm">กำลังตรวจสอบ session ผู้ดูแลระบบ...</div>
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header admin />
        <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-slate-100 to-slate-100">
          <div className="w-full max-w-md space-y-8">
            <form onSubmit={login} className="w-full rounded-3xl border border-slate-200/80 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 mt-3">เข้าสู่ระบบ</h1>
                <p className="text-base font-semibold text-slate-500 mt-1.5">เฉพาะพนักงาน JBM PRO AUTO เท่านั้น</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-extrabold text-slate-800 block mb-1.5" htmlFor="admin-username">ชื่อผู้ใช้งาน (Username)</label>
                  <input
                    id="admin-username"
                    value={usernameInput}
                    onChange={(event) => setUsernameInput(event.target.value)}
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400"
                    placeholder="กรอกชื่อผู้ใช้งาน"
                    type="text"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="text-sm font-extrabold text-slate-800 block mb-1.5" htmlFor="admin-password">รหัสผ่าน (Password)</label>
                  <input
                    id="admin-password"
                    value={passwordInput}
                    onChange={(event) => setPasswordInput(event.target.value)}
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400"
                    placeholder="กรอกรหัสผ่าน"
                    type="password"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {loginError && (
                <div className="mt-4 flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-200 text-rose-800 text-xs font-bold">!</span>
                  <p className="text-sm font-bold leading-relaxed">{loginError}</p>
                </div>
              )}

              <button className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 px-5 text-base font-extrabold text-white hover:from-blue-600 hover:to-blue-700 transition-all-300 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-blue-900/10" type="submit">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    กำลังตรวจสอบ...
                  </span>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5 stroke-[2.2]" />
                    เข้าสู่ระบบ
                  </>
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }
  const allAdminNav = adminNavGroups.flatMap((g) => g.items);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <div className="lg:flex lg:flex-row w-full">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-[280px] max-w-[86vw] transform overflow-y-auto border-r border-slate-800 bg-slate-950 text-slate-300 transition-all duration-300 lg:static lg:max-w-none lg:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-16 items-center justify-between border-b border-slate-900 px-5 bg-slate-950">
            <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                <Wrench className="h-5 w-5 stroke-[2.2]" />
              </span>
              JBM Admin
            </Link>
            <button className="rounded-xl p-2 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden" onClick={() => setMobileMenu(false)} type="button" aria-label="ปิดเมนู">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-900/50 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-extrabold">
              AD
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-white truncate">Administrator</p>
              <p className="text-xs font-semibold text-slate-500 truncate">ฝ่ายบริการซ่อมรถ</p>
            </div>
          </div>

          <nav className="space-y-4 p-3 pb-8">
            {adminNavGroups.map((section, index) => (
              <div key={index}>
                <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{section.group}</h3>
                <div className="space-y-1">
                  {section.items.map(([key, label, Icon]) => {
                    const active = activeTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setActiveTab(key);
                          if (key === 'form') setEditing({ ...emptyVehicle });
                        }}
                        className={`flex min-h-12 w-full items-center gap-3.5 rounded-xl px-3.5 text-left text-sm font-bold transition-all duration-200 ${active ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/15' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'}`}
                        type="button"
                      >
                        <Icon className={`h-5 w-5 shrink-0 transition-transform ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                        <span className="min-w-0 break-words leading-tight">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Panel */}
        <main className="min-h-screen min-w-0 flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 shadow-sm">
            <button className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden" onClick={() => setMobileMenu(true)} type="button" aria-label="เปิดเมนู">
              <Menu className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <h1 className="break-words text-xl sm:text-2xl font-extrabold text-slate-900">
                {allAdminNav.find(([key]) => key === activeTab)?.[1]}
              </h1>
            </div>
            <button className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 transition-all-300" onClick={logout} type="button">
              <Lock className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </div>

          {/* Content Wrapper */}
          <div className="flex-1 space-y-6 p-4 sm:p-6 bg-slate-50">
            {activeTab === 'dashboard' && <Dashboard stats={stats} vehicles={vehicles} stockProducts={stockProducts} statusFilter={dashboardStatusFilter} setStatusFilter={setDashboardStatusFilter} />}
            {activeTab === 'form' && <VehicleForm initial={editing || emptyVehicle} onSave={saveVehicle} onCancel={() => setActiveTab('dashboard')} />}
            {activeTab === 'shift-duty' && <ShiftDutyPage />}
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
                movementError={stockMovementError}
                onAdjustQuantity={adjustStockQuantity}
                onSaveProduct={saveStockProduct}
                onDeleteProduct={deleteStockProduct}
                onSaveCategory={saveStockCategory}
                onDeleteCategory={deleteStockCategory}
                onToggleCategory={toggleStockCategory}
              />
            )}
            {activeTab === 'in-shop' && <InShop vehicles={inShopVehicles} query={inShopQuery} setQuery={setInShopQuery} />}
            {activeTab === 'finance' && <FinancialAdmin headers={headers} />}
            {activeTab === 'charts' && <ManagementDashboard vehicles={vehicles} stockProducts={stockProducts} />}
          </div>
        </main>
      </div>
      {selectedVehicle && <VehicleDetailModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />}
    </div>
  );
}

function StockProductPage({ products, categories, movements, movementError, onAdjustQuantity, onSaveProduct, onDeleteProduct, onSaveCategory, onDeleteCategory, onToggleCategory }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [tab, setTab] = useState('stock');
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

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
  const exportFilteredProducts = () => {
    downloadCsv(
      `stock-products-${filterSegment(categoryFilter)}-${filterSegment(stockFilter)}.csv`,
      [
        { key: 'code', label: 'รหัสสินค้า' },
        { key: 'part_no', label: 'Part No.' },
        { key: 'name', label: 'ชื่อสินค้า' },
        { key: 'category', label: 'หมวดหมู่' },
        { key: 'brand', label: 'ยี่ห้อ' },
        { key: 'car_models', label: 'รุ่นรถที่รองรับ' },
        { key: 'engine_number', label: 'เครื่องยนต์' },
        { key: 'supplier', label: 'ผู้จำหน่าย' },
        { key: 'price', label: 'ราคา' },
        { key: 'quantity', label: 'คงเหลือ' },
        { key: 'status', label: 'สถานะ' },
        { key: 'location', label: 'ตำแหน่งจัดเก็บ' },
        { key: 'note', label: 'หมายเหตุ' },
      ],
      filteredProducts.map((product) => ({
        ...product,
        price: Number(product.price || 0),
        quantity: Number(product.quantity || 0),
        status: stockStatus(product),
      })),
    );
  };

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
            <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr_1fr_auto]">
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
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-lg font-extrabold text-emerald-800 hover:bg-emerald-100" onClick={exportFilteredProducts} type="button">
                <Download className="h-5 w-5" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[860px] text-left text-base md:min-w-[1280px] md:text-lg">
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
        <StockCategoryManager categories={categories} products={products} onEdit={setEditingCategory} onDelete={setDeletingCategory} onToggle={onToggleCategory} onAdd={() => setEditingCategory({ ...emptyStockCategory })} />
      )}

      {tab === 'movements' && <StockMovementHistory movements={movements} errorMessage={movementError} />}

      {editingProduct && (
        <StockProductModal product={editingProduct} categories={activeCategories} onClose={() => setEditingProduct(null)} onSave={async (product) => { await onSaveProduct(product); setEditingProduct(null); }} />
      )}
      {viewingProduct && <StockProductDetail product={viewingProduct} onClose={() => setViewingProduct(null)} />}
      {editingCategory && (
        <StockCategoryModal category={editingCategory} onClose={() => setEditingCategory(null)} onSave={async (category) => { await onSaveCategory(category); setEditingCategory(null); }} />
      )}
      {deletingCategory && (
        <StockConfirmDialog
          title="ลบหมวดหมู่"
          message={`ต้องการลบหมวดหมู่ ${deletingCategory.name || 'นี้'} หรือไม่`}
          confirmText="ลบหมวดหมู่"
          onCancel={() => setDeletingCategory(null)}
          onConfirm={async () => {
            await onDeleteCategory(deletingCategory);
            setDeletingCategory(null);
          }}
        />
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
      </section>
  );
}

function StockCategoryManager({ categories, products, onEdit, onDelete, onToggle, onAdd }) {
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
                <button className="rounded-lg border border-rose-200 px-4 py-2 text-lg font-extrabold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onDelete(category)} disabled={count > 0} type="button" title={count > 0 ? 'ลบไม่ได้เพราะมีสินค้าใช้งานหมวดหมู่นี้' : 'ลบหมวดหมู่'}>ลบ</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StockMovementHistory({ movements, errorMessage }) {
  const [periodFilter, setPeriodFilter] = useState('30d');

  const filteredMovements = useMemo(() => {
    let list = stockMovementRows(movements).map(normalizeStockMovement);
    if (periodFilter === '7d' || periodFilter === '30d') {
      const days = periodFilter === '7d' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      list = list.filter(m => {
        const date = validDateValue(m.created_at);
        return date && date >= cutoff;
      });
    }
    return list.sort((a, b) => {
      const dateA = validDateValue(a.created_at)?.getTime() || 0;
      const dateB = validDateValue(b.created_at)?.getTime() || 0;
      return dateB - dateA;
    });
  }, [movements, periodFilter]);

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return stockMovementRows(movements)
      .map(normalizeStockMovement)
      .filter(m => String(m.created_at || '').startsWith(today)).length;
  }, [movements]);

  const movementDateText = (value) => {
    const date = validDateValue(value);
    return date ? date.toLocaleString('th-TH') : '-';
  };

  const quantityText = (value) => {
    const quantity = Number(value ?? 0);
    return quantity > 0 ? `+${quantity}` : quantity;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950">ประวัติเข้า-ออกสต็อก</h2>
          <p className="text-lg font-bold text-slate-500 mt-1">
            {periodFilter === 'all' ? 'แสดงประวัติทั้งหมด' : `แสดงประวัติ ${periodFilter === '7d' ? '7' : '30'} วันล่าสุด`} จำนวน {filteredMovements.length} รายการ
          </p>
          <div className="mt-2 flex gap-3 text-sm font-bold">
            <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">วันนี้: {todayCount} รายการ</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={periodFilter} 
            onChange={e => setPeriodFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base font-bold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="7d">7 วันล่าสุด</option>
            <option value="30d">30 วันล่าสุด</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 font-bold text-rose-800">
          {errorMessage}
        </div>
      )}

      <section className="max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-left text-base md:min-w-[1180px] md:text-lg">
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
              <th className="p-4">ผู้ทำรายการ</th>
              <th className="p-4">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredMovements.map((movement) => (
              <tr key={movement.id} className="hover:bg-slate-50">
                <td className="p-4 font-bold text-slate-600">{movementDateText(movement.created_at)}</td>
                <td className="p-4 font-mono text-base font-bold text-slate-500">{movement.product_id || '-'}</td>
                <td className="p-4 font-mono font-extrabold text-blue-800">{movement.code || '-'}</td>
                <td className="p-4 font-bold text-slate-900">{movement.name || '-'}</td>
                <td className="p-4 text-center"><span className="rounded-lg bg-blue-50 px-3 py-1 text-base font-extrabold text-blue-800">{movement.type || '-'}</span></td>
                <td className={`p-4 text-center font-extrabold ${Number(movement.quantity_change ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{quantityText(movement.quantity_change)}</td>
                <td className="p-4 text-center font-bold text-slate-500">{movement.quantity_before || 0}</td>
                <td className="p-4 text-center font-extrabold text-slate-900">{movement.quantity_after || 0}</td>
                <td className="p-4 font-bold text-slate-600">{movement.created_by || '-'}</td>
                <td className="p-4 font-bold text-slate-500">{movement.note || '-'}</td>
              </tr>
            ))}
            {filteredMovements.length === 0 && <tr><td className="p-8 text-center text-slate-500" colSpan={10}>ยังไม่มีประวัติเข้า-ออกสต็อกในช่วงเวลานี้</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
function StockProductImage({ product, className }) {
  if (product.image_url) {
    return (
      <img
        className={`shrink-0 rounded-lg border border-slate-200 bg-white object-cover ${className}`}
        src={product.image_url}
        alt={product.name || 'รูปสินค้า'}
        loading="lazy"
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === 'image_url' && value === '') setSelectedFile(null);
  };

  const uploadProductImage = (files) => {
    const file = files[0];
    if (file) {
      setSelectedFile(file);
      update('image_url', URL.createObjectURL(file));
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setError('กรุณากรอกรหัสสินค้าและชื่อสินค้า');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      let finalImageUrl = form.image_url;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('image', selectedFile);
        if (form.id && !form.id.startsWith('stk-')) formData.append('productId', form.id);
        else formData.append('code', form.code);

        const res = await fetch('/api/stock/products/upload-image', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'อัปโหลดรูปไม่สำเร็จ');
        finalImageUrl = data.url;
      } else if (form.image_url && form.image_url.startsWith('data:')) {
        throw new Error('รูปแบบรูปภาพไม่ถูกต้อง กรุณาอัปโหลดใหม่');
      }

      await onSave({ 
        ...form, 
        image_url: finalImageUrl, 
        quantity: Math.max(0, Number(form.quantity || 0)), 
        reorder_point: Math.max(0, Number(form.reorder_point || 0)), 
        price: Math.max(0, Number(form.price || 0)) 
      });
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-[calc(100vw-1rem)] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:max-w-5xl sm:rounded-2xl sm:p-5">
        <StockModalHeader title={product.id && !product.id.startsWith('stk-') ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'} onClose={onClose} />
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-base font-extrabold text-rose-800">
            {error}
          </div>
        )}
        <div className="mb-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
          <StockProductImage product={form} className="h-28 w-28" />
          <div className="flex-1">
            <p className="text-xl font-extrabold text-slate-800">รูปสินค้า</p>
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
          <StockInput label="Brand" value={form.brand} onChange={(value) => update('brand', value)} />
          <StockInput label="รถที่รองรับ" value={form.car_models} onChange={(value) => update('car_models', value)} />
          <StockInput label="ราคาสินค้า" value={form.price} onChange={(value) => update('price', value)} type="number" />
          <StockInput label="ชั้นวางของ" value={form.location} onChange={(value) => update('location', value)} />
          <StockInput label="คงเหลือ" value={form.quantity} onChange={(value) => update('quantity', value)} type="number" />
          <StockInput label="จุดเตือนขั้นต่ำ" value={form.reorder_point} onChange={(value) => update('reorder_point', value)} type="number" />
          <StockInput label="ผู้จัดจำหน่าย" value={form.supplier} onChange={(value) => update('supplier', value)} />
          <StockInput label="Engine" value={form.engine_number} onChange={(value) => update('engine_number', value)} />
          <label className="block xl:col-span-3"><span className="text-xl font-extrabold text-slate-800">หมายเหตุ</span><textarea value={form.note || ''} onChange={(event) => update('note', event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-xl text-slate-950" /></label>
        </div>
        <StockModalActions onClose={onClose} saving={saving} />
      </form>
    </div>
  );
}

function StockProductDetail({ product, onClose }) {
  const rows = [['รหัสสินค้า', product.code], ['ชื่อสินค้า', product.name], ['Part No.', product.part_no], ['หมวดหมู่', product.category], ['ยี่ห้อ', product.brand], ['รถที่รองรับ', product.car_models], ['ราคาสินค้า', `฿${money(product.price)}`], ['ตำแหน่งจัดเก็บ', product.location], ['คงเหลือ', `${product.quantity} ชิ้น`], ['จุดเตือนขั้นต่ำ', product.reorder_point], ['ผู้จัดจำหน่าย', product.supplier], ['หมายเลขเครื่องยนต์', product.engine_number], ['หมายเหตุ', product.note]];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-[calc(100vw-1rem)] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:max-w-4xl sm:rounded-2xl sm:p-5">
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('กรุณากรอกชื่อหมวดหมู่');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (saveError) {
      setError(saveError.message || 'บันทึกหมวดหมู่ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <form onSubmit={submit} className="w-full max-w-[calc(100vw-1rem)] rounded-t-2xl bg-white p-4 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-5">
        <StockModalHeader title={category.id ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'} onClose={onClose} />
        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-base font-extrabold text-rose-800">{error}</div>}
        <StockInput label="ชื่อหมวดหมู่" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
        <label className="mt-4 flex items-center gap-3 text-xl font-extrabold text-slate-800"><input checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} type="checkbox" className="h-5 w-5" />เปิดใช้งานหมวดหมู่</label>
        <StockModalActions onClose={onClose} saving={saving} />
      </form>
    </div>
  );
}

function StockConfirmDialog({ title, message, confirmText, onCancel, onConfirm }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const confirm = async () => {
    setSaving(true);
    setError('');
    try {
      await onConfirm();
    } catch (confirmError) {
      setError(confirmError.message || 'ดำเนินการไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-[calc(100vw-1rem)] rounded-t-2xl bg-white p-4 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-5" role="dialog" aria-modal="true">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-950">{title}</h2>
            <p className="mt-2 text-lg font-bold text-slate-600">{message}</p>
          </div>
          <button className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={onCancel} disabled={saving} type="button" aria-label="ปิด">
            <X className="h-6 w-6" />
          </button>
        </div>
        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-base font-extrabold text-rose-800">{error}</div>}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button className="inline-flex min-h-14 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-xl font-extrabold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={onCancel} disabled={saving} type="button">
            ยกเลิก
          </button>
          <button className="inline-flex min-h-14 items-center justify-center rounded-lg bg-rose-700 px-6 text-xl font-extrabold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-300" onClick={confirm} disabled={saving} type="button">
            {saving ? 'กำลังดำเนินการ...' : confirmText}
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

function StockModalActions({ onClose, saving = false }) {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
      <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-xl font-extrabold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose} disabled={saving} type="button"><X className="h-6 w-6" />ยกเลิก</button>
      <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 text-xl font-extrabold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300" disabled={saving} type="submit"><Save className="h-6 w-6" />{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
    </div>
  );
}

function ShiftDutyPage() {
  const today = dateInputValue(new Date());
  const current = currentYearMonth();
  const emptyEmployee = { id: '', code: '', status: EMPLOYEE_STATUSES[0], firstName: '', lastName: '', nickname: '', position: DEFAULT_EMPLOYEE_POSITIONS[4], photo_url: '', photoUrl: '' };
  const emptyLeave = { employeeId: '', type: LEAVE_TYPES[0], startDate: today, endDate: today, approver: '', reason: '' };
  const [attendanceSettings, setAttendanceSettings] = useState(DEFAULT_ATTENDANCE_SETTINGS);
  const emptyAttendance = {
    employeeId: '',
    date: today,
    morningIn: attendanceSettings.morningStart,
    lunchOut: attendanceSettings.lunchOut,
    afternoonIn: attendanceSettings.afternoonStart,
    eveningOut: attendanceSettings.workEnd,
    method: 'auto',
  };
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState(DEFAULT_EMPLOYEE_POSITIONS);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaveLogs, setLeaveLogs] = useState([]);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [customPosition, setCustomPosition] = useState('');
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [employeePhotoUploading, setEmployeePhotoUploading] = useState(false);
  const [employeePhotoError, setEmployeePhotoError] = useState('');
  const [attendanceForm, setAttendanceForm] = useState(emptyAttendance);
  const [editingAttendanceId, setEditingAttendanceId] = useState('');
  const [historyFilters, setHistoryFilters] = useState({ day: 'all', month: current.month, year: current.year, employeeId: 'all', position: 'all', status: 'all' });
  const [clearAttendance, setClearAttendance] = useState({ month: current.month, year: current.year });
  const [leaveForm, setLeaveForm] = useState(emptyLeave);
  const [editingLeaveId, setEditingLeaveId] = useState('');
  const [leaveFilters, setLeaveFilters] = useState({ month: current.month, year: current.year });
  const [clearLeaves, setClearLeaves] = useState({ month: current.month, year: current.year });
  const [summaryFilters, setSummaryFilters] = useState({ day: 'all', month: current.month, year: current.year });
  const [employeeSubTab, setEmployeeSubTab] = useState('dashboard');

  const authHeaders = useCallback(() => {
    return {};
  }, []);

  const loadEmployeeData = useCallback(async () => {
    try {
      const [employeesResponse, positionsResponse, attendanceResponse, leavesResponse, settingsResponse] = await Promise.all([
        fetch(EMPLOYEES_API_URL, { headers: authHeaders() }),
        fetch(EMPLOYEE_POSITIONS_API_URL, { headers: authHeaders() }),
        fetch(EMPLOYEE_ATTENDANCE_API_URL, { headers: authHeaders() }),
        fetch(EMPLOYEE_LEAVES_API_URL, { headers: authHeaders() }),
        fetch(ATTENDANCE_SETTINGS_API_URL, { headers: authHeaders() }),
      ]);
      const [employeesData, positionsData, attendanceData, leavesData, settingsData] = await Promise.all([
        employeesResponse.json().catch(() => ({})),
        positionsResponse.json().catch(() => ({})),
        attendanceResponse.json().catch(() => ({})),
        leavesResponse.json().catch(() => ({})),
        settingsResponse.json().catch(() => ({})),
      ]);
      if (!employeesResponse.ok || !positionsResponse.ok || !attendanceResponse.ok || !leavesResponse.ok || !settingsResponse.ok) {
        throw new Error('load employee data failed');
      }
      const nextEmployees = (employeesData.employees || []).map(normalizeEmployee);
      setEmployees(nextEmployees);
      writeStorageArray(EMPLOYEES_STORAGE_KEY, nextEmployees);
      const nextPositions = (positionsData.positions || []).map((position) => position.name).filter(Boolean);
      setPositions(Array.from(new Set([...DEFAULT_EMPLOYEE_POSITIONS, ...nextPositions])));
      setAttendanceLogs(attendanceData.logs || []);
      setLeaveLogs(leavesData.logs || []);
      setAttendanceSettings(normalizeAttendanceSettings(settingsData.settings || DEFAULT_ATTENDANCE_SETTINGS));
    } catch (error) {
      console.error('[employee] load failed', error);
      const cachedEmployees = readStorageArray(EMPLOYEES_STORAGE_KEY, []).map(normalizeEmployee);
      if (cachedEmployees.length) {
        setEmployees(cachedEmployees);
        setPositions(Array.from(new Set([...DEFAULT_EMPLOYEE_POSITIONS, ...cachedEmployees.map((employee) => employee.position).filter(Boolean)])));
      }
    }
  }, [authHeaders]);

  useEffect(() => {
    loadEmployeeData();
  }, [loadEmployeeData]);

  const employeeMap = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);
  const activeEmployees = employees.filter((employee) => employee.status === 'ทำงานอยู่');
  const years = useMemo(() => {
    const startYear = new Date().getFullYear();
    const items = new Set(Array.from({ length: 11 }, (_, index) => String(startYear + index)));
    attendanceLogs.forEach((log) => items.add(String(log.date || '').slice(0, 4)));
    leaveLogs.forEach((log) => items.add(String(log.submittedAt || log.startDate || '').slice(0, 4)));
    return Array.from(items).filter((year) => /^\d{4}$/.test(year)).sort((a, b) => Number(a) - Number(b));
  }, [attendanceLogs, leaveLogs]);

  const enrichedAttendance = useMemo(() => attendanceLogs.map((log) => {
    const employee = employeeMap.get(log.employeeId) || {};
    return { ...log, employee };
  }), [attendanceLogs, employeeMap]);

  const dashboardSummary = useMemo(() => ATTENDANCE_STATUS_KEYS.map((status) => ({
    status,
    count: enrichedAttendance.filter((log) => log.status === status && String(log.date || '').startsWith(`${current.year}-${current.month}`)).length,
  })), [current.month, current.year, enrichedAttendance]);

  const filteredAttendance = useMemo(() => enrichedAttendance.filter((log) => {
    const date = String(log.date || '');
    if (historyFilters.day !== 'all' && date.slice(8, 10) !== historyFilters.day) return false;
    if (historyFilters.month !== 'all' && date.slice(5, 7) !== historyFilters.month) return false;
    if (historyFilters.year !== 'all' && !date.startsWith(historyFilters.year)) return false;
    if (historyFilters.employeeId !== 'all' && log.employeeId !== historyFilters.employeeId) return false;
    if (historyFilters.position !== 'all' && log.employee.position !== historyFilters.position) return false;
    if (historyFilters.status !== 'all' && log.status !== historyFilters.status) return false;
    return true;
  }), [enrichedAttendance, historyFilters]);

  const filteredLeaveLogs = useMemo(() => leaveLogs.filter((log) => {
    const submittedAt = String(log.submittedAt || '');
    if (leaveFilters.month !== 'all' && submittedAt.slice(5, 7) !== leaveFilters.month) return false;
    if (leaveFilters.year !== 'all' && !submittedAt.startsWith(leaveFilters.year)) return false;
    return true;
  }), [leaveFilters, leaveLogs]);
  const customPositions = useMemo(() => positions.filter((position) => (
    position && !DEFAULT_EMPLOYEE_POSITIONS.includes(position) && position !== OTHER_EMPLOYEE_POSITION
  )), [positions]);

  const matchesSummaryDate = useCallback((date) => {
    const key = String(date || '').slice(0, 10);
    if (summaryFilters.year !== 'all' && !key.startsWith(summaryFilters.year)) return false;
    if (summaryFilters.month !== 'all' && key.slice(5, 7) !== summaryFilters.month) return false;
    if (summaryFilters.day !== 'all' && key.slice(8, 10) !== summaryFilters.day) return false;
    return true;
  }, [summaryFilters]);

  const leaveDays = countLeaveDays(leaveForm.startDate, leaveForm.endDate);
  const summaryRows = employees.map((employee) => {
    const monthRows = attendanceLogs.filter((log) => {
      if (log.employeeId !== employee.id) return false;
      return matchesSummaryDate(log.date);
    });
    const yearRows = attendanceLogs.filter((log) => log.employeeId === employee.id && String(log.date || '').startsWith(summaryFilters.year));
    return {
      employee,
      filteredDays: monthRows.length,
      monthHours: Number(monthRows.reduce((sum, log) => sum + Number(log.hours || 0), 0).toFixed(2)),
      yearHours: Number(yearRows.reduce((sum, log) => sum + Number(log.hours || 0), 0).toFixed(2)),
    };
  });

  const comparisonRows = employees.map((employee) => {
    const rows = attendanceLogs.filter((log) => log.employeeId === employee.id && matchesSummaryDate(log.date));
    const leaveRows = leaveLogs.filter((log) => log.employeeId === employee.id);
    const counts = ATTENDANCE_STATUS_KEYS.reduce((acc, status) => ({ ...acc, [status]: rows.filter((log) => log.status === status).length }), {});
    leaveRows.forEach((log) => {
      if (!LEAVE_TYPES.includes(log.type)) return;
      daysInDateRange(log.startDate, log.endDate).forEach((date) => {
        if (matchesSummaryDate(date)) counts[log.type] = Number(counts[log.type] || 0) + 1;
      });
    });
    return {
      employee,
      counts,
    };
  });
  const exportEmployeeSummary = () => {
    downloadCsv(
      `employee-summary-${filterSegment(summaryFilters.year)}-${filterSegment(summaryFilters.month)}-${filterSegment(summaryFilters.day)}.csv`,
      [
        { key: 'code', label: 'รหัสพนักงาน' },
        { key: 'fullName', label: 'ชื่อ-นามสกุล' },
        { key: 'nickname', label: 'ชื่อเล่น' },
        { key: 'position', label: 'ตำแหน่ง' },
        { key: 'filteredDays', label: 'จำนวนวันลงเวลา' },
        { key: 'monthHours', label: 'ชั่วโมงตามตัวกรอง' },
        { key: 'yearHours', label: 'ชั่วโมงตลอดปี' },
        { key: 'status', label: 'สถานะพนักงาน' },
      ],
      summaryRows.map((row) => ({
        code: row.employee.code,
        fullName: employeeFullName(row.employee),
        nickname: row.employee.nickname || '-',
        position: row.employee.position || '-',
        filteredDays: row.filteredDays,
        monthHours: row.monthHours,
        yearHours: row.yearHours,
        status: row.employee.status || '-',
      })),
    );
  };
  const exportAttendanceHistory = () => {
    downloadCsv(
      `employee-attendance-${filterSegment(historyFilters.year)}-${filterSegment(historyFilters.month)}.csv`,
      [
        { key: 'date', label: 'วันที่' },
        { key: 'employeeCode', label: 'รหัสพนักงาน' },
        { key: 'fullName', label: 'ชื่อ-นามสกุล' },
        { key: 'nickname', label: 'ชื่อเล่น' },
        { key: 'position', label: 'ตำแหน่ง' },
        { key: 'morningIn', label: 'เวลาเข้าเช้า' },
        { key: 'lunchOut', label: 'เวลาออกพักเที่ยง' },
        { key: 'afternoonIn', label: 'เวลากลับจากพัก' },
        { key: 'eveningOut', label: 'เวลาออกงานเย็น' },
        { key: 'status', label: 'สถานะ' },
        { key: 'hours', label: 'ชั่วโมงทำงานรวม' },
      ],
      filteredAttendance.map((log) => ({
        date: dateText(log.date),
        employeeCode: log.employee.code || log.employeeCode || '-',
        fullName: employeeFullName(log.employee),
        nickname: log.employee.nickname || '-',
        position: log.employee.position || '-',
        morningIn: log.morningIn || '-',
        lunchOut: log.lunchOut || '-',
        afternoonIn: log.afternoonIn || '-',
        eveningOut: log.eveningOut || '-',
        status: log.status || '-',
        hours: Number(log.hours || 0),
      })),
    );
  };
  const exportLeaveReport = () => {
    downloadCsv(
      `employee-leaves-${filterSegment(leaveFilters.year)}-${filterSegment(leaveFilters.month)}.csv`,
      [
        { key: 'submittedAt', label: 'วันที่ยื่น' },
        { key: 'employeeCode', label: 'รหัสพนักงาน' },
        { key: 'fullName', label: 'พนักงาน' },
        { key: 'type', label: 'ประเภทลา' },
        { key: 'startDate', label: 'ตั้งแต่วันที่' },
        { key: 'endDate', label: 'ถึงวันที่' },
        { key: 'totalDays', label: 'รวมวัน' },
        { key: 'approver', label: 'ผู้อนุมัติ' },
        { key: 'reason', label: 'สาเหตุ' },
      ],
      filteredLeaveLogs.map((log) => {
        const employee = employeeMap.get(log.employeeId) || {};
        return {
          submittedAt: dateText(log.submittedAt),
          employeeCode: employee.code || log.employeeCode || '-',
          fullName: employeeFullName(employee),
          type: log.type || '-',
          startDate: dateText(log.startDate),
          endDate: dateText(log.endDate),
          totalDays: Number(log.totalDays || 0),
          approver: log.approver || '-',
          reason: log.reason || '-',
        };
      }),
    );
  };
  const attendancePreviewStatus = calculateAttendanceStatus(attendanceForm.method, attendanceForm.morningIn, attendanceForm.afternoonIn, attendanceSettings);
  const attendanceRequiresWorkTimes = isAttendanceAutoMode(attendanceForm.method) || attendancePreviewStatus === 'มาทำงาน' || attendancePreviewStatus.startsWith('สาย');
  const attendancePreviewHours = attendancePreviewStatus === 'มาทำงาน' || attendancePreviewStatus.startsWith('สาย')
    ? calculateWorkHours(attendanceForm.morningIn, attendanceForm.lunchOut, attendanceForm.afternoonIn, attendanceForm.eveningOut)
    : 0;
  const isEditingEmployee = Boolean(employeeForm.id);
  const editingAttendance = editingAttendanceId ? attendanceLogs.find((log) => log.id === editingAttendanceId) : null;
  const editingLeave = editingLeaveId ? leaveLogs.find((log) => log.id === editingLeaveId) : null;

  const uploadEmployeePhoto = async (file) => {
    if (!file) return;
    setEmployeePhotoUploading(true);
    setEmployeePhotoError('');
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('employeeId', employeeForm.id || employeeForm.code || 'employee');
      const response = await fetch(EMPLOYEE_PHOTO_UPLOAD_API_URL, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'อัปโหลดรูปพนักงานไม่สำเร็จ');
      setEmployeeForm((form) => ({ ...form, photo_url: data.url, photoUrl: data.url }));
    } catch (error) {
      setEmployeePhotoError(error.message || 'อัปโหลดรูปพนักงานไม่สำเร็จ');
    } finally {
      setEmployeePhotoUploading(false);
    }
  };

  const saveEmployee = async (event) => {
    event.preventDefault();
    const normalized = normalizeEmployee(employeeForm);
    const previousEmployee = normalized.id ? employees.find((employee) => employee.id === normalized.id) || null : null;
    const nextPosition = normalized.position === OTHER_EMPLOYEE_POSITION ? customPosition.trim() : normalized.position;
    if (!normalized.code || !normalized.firstName || !normalized.lastName || !normalized.nickname || !nextPosition) {
      window.alert('กรุณากรอกรหัสพนักงาน ชื่อจริง นามสกุล ชื่อเล่น และตำแหน่งงาน');
      return;
    }
    const duplicateCode = employees.some((employee) => employee.code === normalized.code && employee.id !== normalized.id);
    if (duplicateCode) {
      window.alert(`รหัสพนักงาน ${normalized.code} ถูกใช้งานแล้ว`);
      return;
    }
    const nextEmployee = { ...normalized, position: nextPosition };
    let savedEmployee = null;
    let usedLocalFallback = false;
    try {
      if (!positions.includes(nextPosition)) {
        const positionResponse = await fetch(EMPLOYEE_POSITIONS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ name: nextPosition, sortOrder: positions.length + 1, active: true }),
        });
        if (!positionResponse.ok) throw await readApiError(positionResponse, 'บันทึกตำแหน่งงานไม่สำเร็จ');
      }
      const response = await fetch(EMPLOYEES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(nextEmployee),
      });
      if (!response.ok) throw await readApiError(response, 'บันทึกข้อมูลพนักงานไม่สำเร็จ');
      const savedData = await response.json().catch(() => ({}));
      savedEmployee = normalizeEmployee(savedData.employee || nextEmployee);
    } catch (error) {
      if (!canFallbackToLocalStorage(error)) {
        window.alert(error.message || 'บันทึกข้อมูลพนักงานไม่สำเร็จ');
        return;
      }
      console.error('[employee] save fallback to localStorage', error);
      savedEmployee = normalizeEmployee(nextEmployee);
      usedLocalFallback = true;
    }

    const nextEmployees = [savedEmployee, ...employees.filter((employee) => employee.id !== savedEmployee.id)];
    setEmployees(nextEmployees);
    writeStorageArray(EMPLOYEES_STORAGE_KEY, nextEmployees);
    if (!positions.includes(nextPosition)) setPositions((current) => Array.from(new Set([...current, nextPosition])));
    addAuditLog({
      action: previousEmployee ? 'UPDATE' : 'CREATE',
      module: 'EMPLOYEE',
      targetId: savedEmployee.id,
      targetLabel: `${savedEmployee.code} ${employeeFullName(savedEmployee)}`.trim(),
      beforeData: previousEmployee,
      afterData: savedEmployee,
    });
    setEmployeeForm(emptyEmployee);
    setCustomPosition('');
    if (usedLocalFallback) {
      window.alert('บันทึกชั่วคราวในเครื่อง เพราะเชื่อมต่อฐานข้อมูลไม่ได้');
    } else {
      await loadEmployeeData();
    }
  };

  const editEmployee = (employee) => {
    setEmployeeForm(normalizeEmployee(employee));
    setCustomPosition('');
    setEmployeePhotoError('');
  };

  const cancelEmployeeEdit = () => {
    setEmployeeForm(emptyEmployee);
    setCustomPosition('');
    setEmployeePhotoError('');
  };

  const deleteEmployee = async (employee) => {
    if (!window.confirm(`ยืนยันการลบข้อมูลพนักงาน ${employeeFullName(employee)}`)) return;
    const previousEmployee = employees.find((item) => item.id === employee.id) || employee;
    let usedLocalFallback = false;
    try {
      const response = await fetch(`${EMPLOYEES_API_URL}?id=${encodeURIComponent(employee.id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!response.ok) throw await readApiError(response, 'ลบข้อมูลพนักงานไม่สำเร็จ');
    } catch (error) {
      if (!canFallbackToLocalStorage(error)) {
        window.alert(error.message || 'ลบข้อมูลพนักงานไม่สำเร็จ');
        return;
      }
      console.error('[employee] delete fallback to localStorage', error);
      usedLocalFallback = true;
    }
    const nextEmployees = employees.filter((item) => item.id !== employee.id);
    setEmployees(nextEmployees);
    writeStorageArray(EMPLOYEES_STORAGE_KEY, nextEmployees);
    addAuditLog({
      action: 'DELETE',
      module: 'EMPLOYEE',
      targetId: previousEmployee.id,
      targetLabel: `${previousEmployee.code} ${employeeFullName(previousEmployee)}`.trim(),
      beforeData: previousEmployee,
      afterData: null,
    });
    if (employeeForm.id === employee.id) cancelEmployeeEdit();
    if (detailEmployee?.id === employee.id) setDetailEmployee(null);
    if (usedLocalFallback) {
      window.alert('บันทึกชั่วคราวในเครื่อง เพราะเชื่อมต่อฐานข้อมูลไม่ได้');
    } else {
      await loadEmployeeData();
    }
  };

  const deleteCustomPosition = async (position) => {
    if (DEFAULT_EMPLOYEE_POSITIONS.includes(position) || position === OTHER_EMPLOYEE_POSITION) return;
    const usedBy = employees.filter((employee) => employee.position === position);
    if (usedBy.length > 0) {
      window.alert(`ไม่สามารถลบตำแหน่ง "${position}" ได้ เพราะมีพนักงานใช้อยู่ ${usedBy.length} คน`);
      return;
    }
    if (!window.confirm(`ยืนยันการลบตำแหน่ง "${position}"`)) return;
    const existing = (await (async () => {
      const response = await fetch(EMPLOYEE_POSITIONS_API_URL, { headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      return (data.positions || []).find((item) => item.name === position);
    })());
    if (existing?.id) {
      await fetch(`${EMPLOYEE_POSITIONS_API_URL}?id=${encodeURIComponent(existing.id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
    }
    if (employeeForm.position === position) setEmployeeForm((form) => ({ ...form, position: DEFAULT_EMPLOYEE_POSITIONS[4] }));
    await loadEmployeeData();
  };

  const saveAttendance = async (event) => {
    event.preventDefault();
    const previousLog = editingAttendanceId ? attendanceLogs.find((log) => log.id === editingAttendanceId) || null : null;
    if (!attendanceForm.employeeId) {
      window.alert('กรุณาเลือกพนักงาน');
      return;
    }
    const normalizedMorningIn = finalizeTimeInput(attendanceForm.morningIn);
    const normalizedLunchOut = finalizeTimeInput(attendanceForm.lunchOut);
    const normalizedAfternoonIn = finalizeTimeInput(attendanceForm.afternoonIn);
    const normalizedEveningOut = finalizeTimeInput(attendanceForm.eveningOut);
    const status = attendancePreviewStatus;
    const requiresWorkTimes = isAttendanceAutoMode(attendanceForm.method) || status === 'มาทำงาน' || status.startsWith('สาย');
    if (requiresWorkTimes) {
      const requiredFields = [
        ['เวลาเข้าเช้า', normalizedMorningIn],
        ['เวลาออกพักเที่ยง', normalizedLunchOut],
        ['เวลากลับจากพัก', normalizedAfternoonIn],
        ['เวลาออกงานเย็น', normalizedEveningOut],
      ];
      if (requiredFields.some(([_, value]) => !String(value || '').trim())) {
        window.alert('กรุณากรอกเวลาให้ครบ 4 ช่องสำหรับสถานะมาทำงาน/สาย');
        return;
      }
      const timeError = validateTimeFields(requiredFields);
      if (timeError) {
        window.alert(timeError);
        return;
      }
      if (calculateWorkHours(normalizedMorningIn, normalizedLunchOut, normalizedAfternoonIn, normalizedEveningOut) <= 0) {
        window.alert('เวลาเข้างานไม่ถูกต้อง กรุณาตรวจสอบช่วงเวลาอีกครั้ง');
        return;
      }
    }
    const employee = employeeMap.get(attendanceForm.employeeId);
    const hasWorkHours = status === 'มาทำงาน' || status.startsWith('สาย');
    const nextLog = {
      id: editingAttendanceId || `att-${Date.now()}`,
      ...attendanceForm,
      morningIn: hasWorkHours ? normalizedMorningIn : '',
      lunchOut: hasWorkHours ? normalizedLunchOut : '',
      afternoonIn: hasWorkHours ? normalizedAfternoonIn : '',
      eveningOut: hasWorkHours ? normalizedEveningOut : '',
      employeeCode: employee?.code || '',
      status,
      hours: hasWorkHours ? calculateWorkHours(normalizedMorningIn, normalizedLunchOut, normalizedAfternoonIn, normalizedEveningOut) : 0,
      createdAt: editingAttendanceId ? (attendanceLogs.find((log) => log.id === editingAttendanceId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };
    const response = await fetch(EMPLOYEE_ATTENDANCE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(nextLog),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      window.alert(data?.error || 'บันทึกลงเวลาไม่สำเร็จ');
      return;
    }
    addAuditLog({
      action: previousLog ? 'UPDATE' : 'CREATE',
      module: 'ATTENDANCE',
      targetId: nextLog.id,
      targetLabel: `${employee?.code || '-'} ${employeeFullName(employee || {})} ${nextLog.date}`.trim(),
      beforeData: previousLog,
      afterData: nextLog,
    });
    setAttendanceForm((form) => ({ ...emptyAttendance, employeeId: form.employeeId, date: form.date }));
    setEditingAttendanceId('');
    await loadEmployeeData();
  };

  const editAttendance = (log) => {
    const method = log.method === 'leave' ? 'ลา' : (log.method || (ATTENDANCE_STATUS_KEYS.includes(log.status) && log.status !== 'มาทำงาน' && !String(log.status || '').startsWith('สาย') ? log.status : 'auto'));
    setAttendanceForm({
      employeeId: log.employeeId || '',
      date: String(log.date || today).slice(0, 10),
      morningIn: log.morningIn || attendanceSettings.morningStart,
      lunchOut: log.lunchOut || attendanceSettings.lunchOut,
      afternoonIn: log.afternoonIn || attendanceSettings.afternoonStart,
      eveningOut: log.eveningOut || attendanceSettings.workEnd,
      method,
    });
    setEditingAttendanceId(log.id);
  };

  const cancelAttendanceEdit = () => {
    setAttendanceForm(emptyAttendance);
    setEditingAttendanceId('');
  };

  const deleteAttendance = async (log) => {
    const employee = employeeMap.get(log.employeeId) || {};
    if (!window.confirm(`ยืนยันการลบประวัติลงเวลาของ ${employeeFullName(employee)} วันที่ ${dateText(log.date)}`)) return;
    const previousLog = attendanceLogs.find((item) => item.id === log.id) || log;
    await fetch(`${EMPLOYEE_ATTENDANCE_API_URL}?id=${encodeURIComponent(log.id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    addAuditLog({
      action: 'DELETE',
      module: 'ATTENDANCE',
      targetId: previousLog.id,
      targetLabel: `${employee?.code || previousLog.employeeCode || '-'} ${employeeFullName(employee)} ${previousLog.date}`.trim(),
      beforeData: previousLog,
      afterData: null,
    });
    if (editingAttendanceId === log.id) cancelAttendanceEdit();
    await loadEmployeeData();
  };

  const clearAttendanceMonth = async () => {
    if (!clearAttendance.month || !clearAttendance.year) return;
    if (!window.confirm(`ยืนยันล้างประวัติตอกเวลาของเดือน ${clearAttendance.month}/${Number(clearAttendance.year) + 543}`)) return;
    const prefix = `${clearAttendance.year}-${clearAttendance.month}`;
    await Promise.all(
      attendanceLogs
        .filter((log) => String(log.date || '').startsWith(prefix))
        .map((log) => fetch(`${EMPLOYEE_ATTENDANCE_API_URL}?id=${encodeURIComponent(log.id)}`, {
          method: 'DELETE',
          headers: authHeaders(),
        }))
    );
    await loadEmployeeData();
  };

  const saveLeave = async (event) => {
    event.preventDefault();
    const previousLeave = editingLeaveId ? leaveLogs.find((log) => log.id === editingLeaveId) || null : null;
    if (!leaveForm.employeeId || leaveDays <= 0) {
      window.alert('กรุณาเลือกพนักงานและช่วงวันที่ลาให้ถูกต้อง');
      return;
    }
    const employee = employeeMap.get(leaveForm.employeeId);
    const nextLeave = {
      id: editingLeaveId || `leave-${Date.now()}`,
      ...leaveForm,
      employeeCode: employee?.code || '',
      totalDays: leaveDays,
      submittedAt: editingLeaveId ? (leaveLogs.find((log) => log.id === editingLeaveId)?.submittedAt || today) : today,
    };
    const response = await fetch(EMPLOYEE_LEAVES_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(nextLeave),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      window.alert(data?.error || 'บันทึกใบลาไม่สำเร็จ');
      return;
    }
    addAuditLog({
      action: previousLeave ? 'UPDATE' : 'CREATE',
      module: 'LEAVE',
      targetId: nextLeave.id,
      targetLabel: `${employee?.code || '-'} ${employeeFullName(employee || {})} ${nextLeave.type}`.trim(),
      beforeData: previousLeave,
      afterData: nextLeave,
    });
    setLeaveForm((form) => ({ ...emptyLeave, employeeId: form.employeeId }));
    setEditingLeaveId('');
    await loadEmployeeData();
  };

  const editLeave = (leave) => {
    setLeaveForm({
      employeeId: leave.employeeId || '',
      type: leave.type || LEAVE_TYPES[0],
      startDate: String(leave.startDate || today).slice(0, 10),
      endDate: String(leave.endDate || leave.startDate || today).slice(0, 10),
      approver: leave.approver || '',
      reason: leave.reason || '',
    });
    setEditingLeaveId(leave.id);
  };

  const cancelLeaveEdit = () => {
    setLeaveForm(emptyLeave);
    setEditingLeaveId('');
  };

  const deleteLeave = async (leave) => {
    if (!window.confirm(`ยืนยันการลบใบลาของ ${employeeFullName(employeeMap.get(leave.employeeId) || {})}`)) return;
    const employee = employeeMap.get(leave.employeeId) || {};
    const previousLeave = leaveLogs.find((item) => item.id === leave.id) || leave;
    await fetch(`${EMPLOYEE_LEAVES_API_URL}?id=${encodeURIComponent(leave.id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    addAuditLog({
      action: 'DELETE',
      module: 'LEAVE',
      targetId: previousLeave.id,
      targetLabel: `${employee?.code || previousLeave.employeeCode || '-'} ${employeeFullName(employee)} ${previousLeave.type}`.trim(),
      beforeData: previousLeave,
      afterData: null,
    });
    if (editingLeaveId === leave.id) cancelLeaveEdit();
    await loadEmployeeData();
  };

  const updateAttendanceSetting = (field, value) => {
    const nextValue = normalizeTimeInput(value);
    setAttendanceSettings((settings) => ({ ...settings, [field]: nextValue }));
    const formFieldMap = {
      morningStart: 'morningIn',
      lunchOut: 'lunchOut',
      afternoonStart: 'afternoonIn',
      workEnd: 'eveningOut',
    };
    if (formFieldMap[field]) {
      setAttendanceForm((form) => ({ ...form, [formFieldMap[field]]: nextValue }));
    }
  };

  const finalizeAttendanceSetting = async (field) => {
    const nextValue = finalizeTimeInput(attendanceSettings[field]);
    setAttendanceSettings((settings) => ({ ...settings, [field]: nextValue }));
    const formFieldMap = {
      morningStart: 'morningIn',
      lunchOut: 'lunchOut',
      afternoonStart: 'afternoonIn',
      workEnd: 'eveningOut',
    };
    if (formFieldMap[field]) {
      setAttendanceForm((form) => ({ ...form, [formFieldMap[field]]: nextValue }));
    }
    await fetch(ATTENDANCE_SETTINGS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ id: 'attendance-settings-default', ...attendanceSettings, [field]: nextValue }),
    });
  };

  const clearLeaveMonth = async () => {
    if (!clearLeaves.month || !clearLeaves.year) return;
    if (!window.confirm(`ยืนยันล้างตารางใบลาของเดือน ${clearLeaves.month}/${Number(clearLeaves.year) + 543}`)) return;
    const prefix = `${clearLeaves.year}-${clearLeaves.month}`;
    await Promise.all(
      leaveLogs
        .filter((log) => String(log.submittedAt || '').startsWith(prefix))
        .map((log) => fetch(`${EMPLOYEE_LEAVES_API_URL}?id=${encodeURIComponent(log.id)}`, {
          method: 'DELETE',
          headers: authHeaders(),
        }))
    );
    await loadEmployeeData();
  };

  const employeeTabs = [
    ['dashboard', 'Dashboard พนักงาน'],
    ['employees', 'รายชื่อพนักงาน'],
    ['attendance', 'ลงเวลางาน'],
    ['leaves', 'การลา'],
    ['reports', 'รายงานสรุป'],
  ];

  return (
    <section className="space-y-6">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex min-w-max gap-2">
          {employeeTabs.map(([key, label]) => (
            <button
              key={key}
              className={`min-h-14 rounded-lg px-5 text-lg font-extrabold ${employeeSubTab === key ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}
              onClick={() => setEmployeeSubTab(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {employeeSubTab === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-lg font-extrabold text-slate-600">พนักงานทั้งหมด</p>
              <p className="mt-2 text-4xl font-extrabold text-slate-950">{employees.length}</p>
            </div>
            <div className={`rounded-xl border p-5 shadow-sm ${EMPLOYEE_STATUS_THEME['ทำงานอยู่'].card}`}>
              <EmployeeStatusBadge status="ทำงานอยู่" />
              <p className="mt-2 text-4xl font-extrabold">{activeEmployees.length}</p>
            </div>
            <div className={`rounded-xl border p-5 shadow-sm ${EMPLOYEE_STATUS_THEME['พักงาน'].card}`}>
              <EmployeeStatusBadge status="พักงาน" />
              <p className="mt-2 text-4xl font-extrabold">{employees.filter((employee) => employee.status === 'พักงาน').length}</p>
            </div>
            <div className={`rounded-xl border p-5 shadow-sm ${EMPLOYEE_STATUS_THEME['ลาออก'].card}`}>
              <EmployeeStatusBadge status="ลาออก" />
              <p className="mt-2 text-4xl font-extrabold">{employees.filter((employee) => employee.status === 'ลาออก').length}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardSummary.map((item) => (
              <div key={item.status} className={`rounded-xl border p-5 shadow-sm ${ATTENDANCE_STATUS_THEME[item.status]?.card || 'border-slate-200 bg-white text-slate-800'}`}>
                <AttendanceStatusBadge status={item.status} />
                <p className="mt-2 text-4xl font-extrabold">{item.count}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-900 shadow-sm">
            <h2 className="text-2xl font-extrabold">ภาพรวมเดือนนี้</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <p className="rounded-lg bg-white/80 p-4 text-lg font-extrabold">ลงเวลาทั้งหมด {enrichedAttendance.filter((log) => String(log.date || '').startsWith(`${current.year}-${current.month}`)).length} รายการ</p>
              <p className="rounded-lg bg-white/80 p-4 text-lg font-extrabold">ชั่วโมงรวม {Number(enrichedAttendance.filter((log) => String(log.date || '').startsWith(`${current.year}-${current.month}`)).reduce((sum, log) => sum + Number(log.hours || 0), 0).toFixed(2))} ชม.</p>
              <p className="rounded-lg bg-white/80 p-4 text-lg font-extrabold">ใบลา {leaveLogs.filter((log) => String(log.submittedAt || '').startsWith(`${current.year}-${current.month}`)).length} รายการ</p>
            </div>
          </div>
        </div>
      )}

      {employeeSubTab === 'employees' && (
      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={saveEmployee} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-950">{isEditingEmployee ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}</h2>
          <div className="mt-4 grid gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-lg font-extrabold text-slate-800">รูปพนักงาน</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <EmployeeAvatar employee={employeeForm} size="lg" />
                <div className="grid flex-1 gap-2">
                  <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-base font-extrabold text-white hover:bg-blue-800">
                    <Upload className="h-5 w-5" />
                    {employeePhotoUploading ? 'กำลังอัปโหลด...' : (employeeForm.photo_url ? 'เปลี่ยนรูปพนักงาน' : 'อัปโหลดรูปพนักงาน')}
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={employeePhotoUploading}
                      onChange={(event) => {
                        uploadEmployeePhoto(event.target.files?.[0]);
                        event.target.value = '';
                      }}
                    />
                  </label>
                  {employeeForm.photo_url && (
                    <button
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-base font-extrabold text-rose-700 hover:bg-rose-50"
                      onClick={() => {
                        setEmployeeForm((form) => ({ ...form, photo_url: '', photoUrl: '' }));
                        setEmployeePhotoError('');
                      }}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                      ลบรูป
                    </button>
                  )}
                  {employeePhotoError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-extrabold text-rose-800">{employeePhotoError}</p>}
                </div>
              </div>
            </div>
            <EmployeeInput label="รหัสพนักงาน" value={employeeForm.code} onChange={(value) => setEmployeeForm({ ...employeeForm, code: value })} />
            <label className="block">
              <span className="text-lg font-extrabold text-slate-800">สถานะพนักงาน</span>
              <select value={employeeForm.status} onChange={(event) => setEmployeeForm({ ...employeeForm, status: event.target.value })} className="mt-2 min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-lg font-bold text-slate-950">
                {EMPLOYEE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <EmployeeInput label="ชื่อจริง" value={employeeForm.firstName} onChange={(value) => setEmployeeForm({ ...employeeForm, firstName: value })} />
            <EmployeeInput label="นามสกุล" value={employeeForm.lastName} onChange={(value) => setEmployeeForm({ ...employeeForm, lastName: value })} />
            <EmployeeInput label="ชื่อเล่น" value={employeeForm.nickname} onChange={(value) => setEmployeeForm({ ...employeeForm, nickname: value })} />
            <label className="block">
              <span className="text-lg font-extrabold text-slate-800">ตำแหน่งงาน</span>
              <select value={employeeForm.position} onChange={(event) => setEmployeeForm({ ...employeeForm, position: event.target.value })} className="mt-2 min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-lg font-bold text-slate-950">
                {positions.map((position) => <option key={position} value={position}>{position}</option>)}
                <option value={OTHER_EMPLOYEE_POSITION}>{OTHER_EMPLOYEE_POSITION}</option>
              </select>
            </label>
            {employeeForm.position === OTHER_EMPLOYEE_POSITION && (
              <EmployeeInput label="ระบุตำแหน่งงาน" value={customPosition} onChange={setCustomPosition} placeholder="พิมพ์ตำแหน่งงานใหม่" />
            )}
            {customPositions.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-lg font-extrabold text-slate-800">จัดการตำแหน่งงานที่เพิ่มเอง</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {customPositions.map((position) => (
                    <span key={position} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
                      {position}
                      <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" onClick={() => deleteCustomPosition(position)} type="button" aria-label={`ลบตำแหน่ง ${position}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className={`grid gap-2 ${isEditingEmployee ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-lg font-extrabold text-white hover:bg-blue-800" type="submit"><Save className="h-5 w-5" />{isEditingEmployee ? 'Update พนักงาน' : 'Create พนักงาน'}</button>
              {isEditingEmployee && (
                <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-5 text-lg font-extrabold text-rose-700 hover:bg-rose-100" onClick={() => deleteEmployee(employeeForm)} type="button"><Trash2 className="h-5 w-5" />Delete พนักงาน</button>
              )}
              <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 text-lg font-extrabold text-slate-700 hover:bg-slate-50" onClick={cancelEmployeeEdit} type="button"><X className="h-5 w-5" />{isEditingEmployee ? 'Cancel' : 'Clear'}</button>
            </div>
          </div>
        </form>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-950">ตารางรายชื่อพนักงาน</h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[920px] text-left text-base">
              <thead className="bg-slate-100 text-sm font-extrabold text-slate-600">
                <tr>
                  <th className="p-3">รหัสพนักงาน</th>
                  <th className="p-3">สถานะพนักงาน</th>
                  <th className="p-3">ชื่อพนักงาน</th>
                  <th className="p-3">นามสกุล</th>
                  <th className="p-3">ชื่อเล่น</th>
                  <th className="p-3">ตำแหน่งงาน</th>
                  <th className="p-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-extrabold text-slate-800">{employee.code}</td>
                    <td className="p-3"><EmployeeStatusBadge status={employee.status} /></td>
                    <td className="p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <EmployeeAvatar employee={employee} size="sm" />
                        <span className="font-bold text-slate-900">{employee.firstName}</span>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{employee.lastName}</td>
                    <td className="p-3 font-bold text-slate-700">{employee.nickname || '-'}</td>
                    <td className="p-3 font-bold text-slate-700">{employee.position}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 font-extrabold text-slate-700 hover:bg-slate-50" onClick={() => setDetailEmployee(employee)} type="button"><Eye className="h-4 w-4" />ดู</button>
                        <button className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 font-extrabold text-blue-800 hover:bg-blue-100" onClick={() => editEmployee(employee)} type="button"><Edit3 className="h-4 w-4" />แก้ไข</button>
                        <button className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 font-extrabold text-rose-700 hover:bg-rose-100" onClick={() => deleteEmployee(employee)} type="button"><Trash2 className="h-4 w-4" />ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && <tr><td className="p-8 text-center text-slate-500" colSpan={7}>ยังไม่มีรายชื่อพนักงาน</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {employeeSubTab === 'attendance' && (
      <>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-950">ตั้งค่าเวลาเกณฑ์การเข้างาน</h2>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <EmployeeTimeInput label="เวลาเข้างานช่วงเช้า" value={attendanceSettings.morningStart} onChange={(value) => updateAttendanceSetting('morningStart', value)} onBlur={() => finalizeAttendanceSetting('morningStart')} />
          <EmployeeTimeInput label="เริ่มนับสายช่วงเช้า" value={attendanceSettings.morningLateAfter} onChange={(value) => updateAttendanceSetting('morningLateAfter', value)} onBlur={() => finalizeAttendanceSetting('morningLateAfter')} />
          <EmployeeTimeInput label="เวลาออกพักเที่ยง" value={attendanceSettings.lunchOut} onChange={(value) => updateAttendanceSetting('lunchOut', value)} onBlur={() => finalizeAttendanceSetting('lunchOut')} />
          <EmployeeTimeInput label="เวลาเข้างานช่วงบ่าย" value={attendanceSettings.afternoonStart} onChange={(value) => updateAttendanceSetting('afternoonStart', value)} onBlur={() => finalizeAttendanceSetting('afternoonStart')} />
          <EmployeeTimeInput label="เริ่มนับสายช่วงบ่าย" value={attendanceSettings.afternoonLateAfter} onChange={(value) => updateAttendanceSetting('afternoonLateAfter', value)} onBlur={() => finalizeAttendanceSetting('afternoonLateAfter')} />
          <EmployeeTimeInput label="เวลาออกงานเย็น" value={attendanceSettings.workEnd} onChange={(value) => updateAttendanceSetting('workEnd', value)} onBlur={() => finalizeAttendanceSetting('workEnd')} />
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={saveAttendance} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-950">บันทึกเวลาเข้างาน</h2>
          <div className="mt-4 grid gap-3">
            <EmployeeSelect label="เลือกพนักงาน" value={attendanceForm.employeeId} employees={activeEmployees} onChange={(value) => setAttendanceForm({ ...attendanceForm, employeeId: value })} />
            <EmployeeInput label="วันที่" type="date" value={attendanceForm.date} onChange={(value) => setAttendanceForm({ ...attendanceForm, date: value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <EmployeeTimeInput disabled={!attendanceRequiresWorkTimes} label="เวลาเข้าเช้า" value={attendanceForm.morningIn} onChange={(value) => setAttendanceForm({ ...attendanceForm, morningIn: value })} onBlur={() => setAttendanceForm((form) => ({ ...form, morningIn: finalizeTimeInput(form.morningIn) }))} />
              <EmployeeTimeInput disabled={!attendanceRequiresWorkTimes} label="เวลาออกพักเที่ยง" value={attendanceForm.lunchOut} onChange={(value) => setAttendanceForm({ ...attendanceForm, lunchOut: value })} onBlur={() => setAttendanceForm((form) => ({ ...form, lunchOut: finalizeTimeInput(form.lunchOut) }))} />
              <EmployeeTimeInput disabled={!attendanceRequiresWorkTimes} label="เวลากลับจากพัก" value={attendanceForm.afternoonIn} onChange={(value) => setAttendanceForm({ ...attendanceForm, afternoonIn: value })} onBlur={() => setAttendanceForm((form) => ({ ...form, afternoonIn: finalizeTimeInput(form.afternoonIn) }))} />
              <EmployeeTimeInput disabled={!attendanceRequiresWorkTimes} label="เวลาออกงานเย็น" value={attendanceForm.eveningOut} onChange={(value) => setAttendanceForm({ ...attendanceForm, eveningOut: value })} onBlur={() => setAttendanceForm((form) => ({ ...form, eveningOut: finalizeTimeInput(form.eveningOut) }))} />
            </div>
            <label className="block">
              <span className="text-lg font-extrabold text-slate-800">สถานะ</span>
              <select value={attendanceForm.method} onChange={(event) => setAttendanceForm({ ...attendanceForm, method: event.target.value })} className="mt-2 min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-lg font-bold text-slate-950">
                <option value="auto">มาทำงาน/สาย (คำนวณจากเวลา)</option>
                <option value="มาทำงาน">มาทำงาน</option>
                <option value="ขาดงาน">ขาดงาน</option>
                {LEAVE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center gap-2 text-base font-extrabold text-emerald-800">
                <span>สถานะที่จะบันทึก:</span>
                <AttendanceStatusBadge status={attendancePreviewStatus} />
              </div>
              <p className="text-base font-bold text-emerald-700">ชั่วโมงทำงานรวม {attendancePreviewHours} ชั่วโมง</p>
            </div>
            <div className={`grid gap-2 ${editingAttendanceId ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-lg font-extrabold text-white hover:bg-blue-800" type="submit"><Save className="h-5 w-5" />{editingAttendanceId ? 'Update เวลา' : 'Create เวลา'}</button>
              {editingAttendanceId && editingAttendance && (
                <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-5 text-lg font-extrabold text-rose-700 hover:bg-rose-100" onClick={() => deleteAttendance(editingAttendance)} type="button"><Trash2 className="h-5 w-5" />Delete เวลา</button>
              )}
              <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 text-lg font-extrabold text-slate-700 hover:bg-slate-50" onClick={cancelAttendanceEdit} type="button"><X className="h-5 w-5" />{editingAttendanceId ? 'Cancel' : 'Clear'}</button>
            </div>
          </div>
        </form>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-950">ประวัติตอกเวลางานย้อนหลังของทีมงาน</h2>
              <p className="text-base font-bold text-slate-500">กรองและล้างเฉพาะเดือนที่เลือก</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <select value={clearAttendance.month} onChange={(event) => setClearAttendance({ ...clearAttendance, month: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold"><MonthOptions /></select>
              <select value={clearAttendance.year} onChange={(event) => setClearAttendance({ ...clearAttendance, year: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold">{years.map((year) => <option key={year} value={year}>{Number(year) + 543}</option>)}</select>
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 font-extrabold text-emerald-800 hover:bg-emerald-100" onClick={exportAttendanceHistory} type="button"><Download className="h-4 w-4" />Export</button>
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 font-extrabold text-rose-700 hover:bg-rose-100" onClick={clearAttendanceMonth} type="button"><Trash2 className="h-4 w-4" />ล้าง</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            <select value={historyFilters.day} onChange={(event) => setHistoryFilters({ ...historyFilters, day: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold"><DayOptions /></select>
            <select value={historyFilters.month} onChange={(event) => setHistoryFilters({ ...historyFilters, month: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold"><option value="all">ทุกเดือน</option><MonthOptions /></select>
            <select value={historyFilters.year} onChange={(event) => setHistoryFilters({ ...historyFilters, year: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold"><option value="all">ทุกปี</option>{years.map((year) => <option key={year} value={year}>{Number(year) + 543}</option>)}</select>
            <select value={historyFilters.employeeId} onChange={(event) => setHistoryFilters({ ...historyFilters, employeeId: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold"><option value="all">พนักงานทั้งหมด</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeFullName(employee)}</option>)}</select>
            <select value={historyFilters.position} onChange={(event) => setHistoryFilters({ ...historyFilters, position: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold"><option value="all">ทุกตำแหน่ง</option>{positions.map((position) => <option key={position} value={position}>{position}</option>)}</select>
            <select value={historyFilters.status} onChange={(event) => setHistoryFilters({ ...historyFilters, status: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold"><option value="all">ทุกสถานะ</option>{ATTENDANCE_STATUS_KEYS.map((status) => <option key={status} value={status}>{status}</option>)}</select>
          </div>
          <AttendanceTable rows={filteredAttendance} onEdit={editAttendance} onDelete={deleteAttendance} />
        </div>
      </div>
      </>
      )}

      {employeeSubTab === 'leaves' && (
      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={saveLeave} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-950">การลา</h2>
          <div className="mt-4 grid gap-3">
            <EmployeeSelect label="เลือกพนักงานผู้ลา" value={leaveForm.employeeId} employees={employees} onChange={(value) => setLeaveForm({ ...leaveForm, employeeId: value })} />
            <label className="block"><span className="text-lg font-extrabold text-slate-800">ประเภทสิทธิ์การลา</span><select value={leaveForm.type} onChange={(event) => setLeaveForm({ ...leaveForm, type: event.target.value })} className="mt-2 min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-lg font-bold">{LEAVE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <EmployeeInput label="ตั้งแต่วันที่" type="date" value={leaveForm.startDate} onChange={(value) => setLeaveForm({ ...leaveForm, startDate: value })} />
            <EmployeeInput label="ถึงวันที่" type="date" value={leaveForm.endDate} onChange={(value) => setLeaveForm({ ...leaveForm, endDate: value })} />
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xl font-extrabold text-blue-900">รวม {leaveDays} วัน</div>
            <EmployeeInput label="แอดมินผู้อนุมัติ" value={leaveForm.approver} onChange={(value) => setLeaveForm({ ...leaveForm, approver: value })} />
            <label className="block"><span className="text-lg font-extrabold text-slate-800">สาเหตุและความจำเป็น</span><textarea value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg text-slate-950" /></label>
            <div className={`grid gap-2 ${editingLeaveId ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-lg font-extrabold text-white hover:bg-blue-800" type="submit"><Save className="h-5 w-5" />{editingLeaveId ? 'Update ใบลา' : 'Create ใบลา'}</button>
              {editingLeaveId && editingLeave && (
                <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-5 text-lg font-extrabold text-rose-700 hover:bg-rose-100" onClick={() => deleteLeave(editingLeave)} type="button"><Trash2 className="h-5 w-5" />Delete ใบลา</button>
              )}
              <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 text-lg font-extrabold text-slate-700 hover:bg-slate-50" onClick={cancelLeaveEdit} type="button"><X className="h-5 w-5" />{editingLeaveId ? 'Cancel' : 'Clear'}</button>
            </div>
          </div>
        </form>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="text-2xl font-extrabold text-slate-950">รายงานสถิติใบลาหยุดงาน</h2>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
              <select value={leaveFilters.month} onChange={(event) => setLeaveFilters({ ...leaveFilters, month: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold"><option value="all">ทุกเดือน</option><MonthOptions /></select>
              <select value={leaveFilters.year} onChange={(event) => setLeaveFilters({ ...leaveFilters, year: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold"><option value="all">ทุกปี</option>{years.map((year) => <option key={year} value={year}>{Number(year) + 543}</option>)}</select>
              <select value={clearLeaves.month} onChange={(event) => setClearLeaves({ ...clearLeaves, month: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold"><MonthOptions /></select>
              <select value={clearLeaves.year} onChange={(event) => setClearLeaves({ ...clearLeaves, year: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold">{years.map((year) => <option key={year} value={year}>{Number(year) + 543}</option>)}</select>
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 font-extrabold text-emerald-800 hover:bg-emerald-100" onClick={exportLeaveReport} type="button"><Download className="h-4 w-4" />Export</button>
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 font-extrabold text-rose-700 hover:bg-rose-100" onClick={clearLeaveMonth} type="button"><Trash2 className="h-4 w-4" />ล้าง</button>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[1080px] text-left text-base">
              <thead className="bg-slate-100 text-sm font-extrabold text-slate-600"><tr><th className="p-3">วันที่ยื่น</th><th className="p-3">พนักงาน</th><th className="p-3">ประเภทลา</th><th className="p-3">ตั้งแต่วันที่</th><th className="p-3">ถึงวันที่</th><th className="p-3">รวมวัน</th><th className="p-3">ผู้อนุมัติ</th><th className="p-3">สาเหตุ</th><th className="p-3 text-right">จัดการ</th></tr></thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLeaveLogs.map((log) => {
                  const employee = employeeMap.get(log.employeeId) || {};
                  return <tr key={log.id} className="hover:bg-slate-50"><td className="p-3 font-bold">{dateText(log.submittedAt)}</td><td className="p-3 font-extrabold">{employeeFullName(employee)}</td><td className="p-3"><AttendanceStatusBadge status={log.type} /></td><td className="p-3">{dateText(log.startDate)}</td><td className="p-3">{dateText(log.endDate)}</td><td className="p-3 font-extrabold text-blue-800">{log.totalDays}</td><td className="p-3">{log.approver || '-'}</td><td className="max-w-[260px] break-words p-3">{log.reason || '-'}</td><td className="p-3"><div className="flex justify-end gap-2"><button className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 font-extrabold text-blue-800 hover:bg-blue-100" onClick={() => editLeave(log)} type="button"><Edit3 className="h-4 w-4" />แก้ไข</button><button className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 font-extrabold text-rose-700 hover:bg-rose-100" onClick={() => deleteLeave(log)} type="button"><Trash2 className="h-4 w-4" />ลบ</button></div></td></tr>;
                })}
                {filteredLeaveLogs.length === 0 && <tr><td className="p-8 text-center text-slate-500" colSpan={9}>ยังไม่มีใบลา</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {employeeSubTab === 'reports' && (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="text-2xl font-extrabold text-slate-950">ตารางสรุป</h2>
          <div className="grid gap-2 sm:grid-cols-4">
            <select value={summaryFilters.day} onChange={(event) => setSummaryFilters({ ...summaryFilters, day: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold"><DayOptions /></select>
            <select value={summaryFilters.month} onChange={(event) => setSummaryFilters({ ...summaryFilters, month: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold"><MonthOptions /></select>
            <select value={summaryFilters.year} onChange={(event) => setSummaryFilters({ ...summaryFilters, year: event.target.value })} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-bold">{years.map((year) => <option key={year} value={year}>{Number(year) + 543}</option>)}</select>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 font-extrabold text-emerald-800 hover:bg-emerald-100" onClick={exportEmployeeSummary} type="button"><Download className="h-4 w-4" />Export</button>
          </div>
        </div>
        <h3 className="mb-3 mt-5 text-xl font-extrabold text-slate-950">รายงานสรุปชั่วโมงทำงานสะสม รายเดือน/รายปี</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[980px] text-left text-base">
            <thead className="bg-slate-100 text-sm font-extrabold text-slate-600"><tr><th className="p-3">รหัสพนักงาน</th><th className="p-3">ชื่อ-นามสกุล</th><th className="p-3">ชื่อเล่น</th><th className="p-3">ตำแหน่ง</th><th className="p-3">จำนวนวันลงเวลา</th><th className="p-3">ชั่วโมงเดือนที่เลือก</th><th className="p-3">ชั่วโมงตลอดปี</th><th className="p-3">สถานะพนักงาน</th></tr></thead>
            <tbody className="divide-y divide-slate-200">{summaryRows.map((row) => <tr key={row.employee.id}><td className="p-3 font-mono font-extrabold">{row.employee.code}</td><td className="p-3 font-bold">{employeeFullName(row.employee)}</td><td className="p-3">{row.employee.nickname || '-'}</td><td className="p-3">{row.employee.position}</td><td className="p-3 font-extrabold">{row.filteredDays}</td><td className="p-3 font-extrabold text-emerald-700">{row.monthHours}</td><td className="p-3 font-extrabold text-blue-800">{row.yearHours}</td><td className="p-3"><EmployeeStatusBadge status={row.employee.status} /></td></tr>)}</tbody>
          </table>
        </div>
        <h3 className="mb-3 mt-6 text-xl font-extrabold text-slate-950">ตารางเปรียบเทียบสถิติมาร่วมงานสะสมแยกตามตำแหน่ง</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[1180px] text-left text-base">
            <thead className="bg-slate-100 text-sm font-extrabold text-slate-600"><tr><th className="p-3">รหัสพนักงาน</th><th className="p-3">ชื่อ-นามสกุล</th><th className="p-3">ชื่อเล่น</th><th className="p-3">ตำแหน่งงาน</th>{ATTENDANCE_STATUS_KEYS.map((status) => <th key={status} className="p-3"><AttendanceStatusBadge status={status} /></th>)}</tr></thead>
            <tbody className="divide-y divide-slate-200">{comparisonRows.map((row) => <tr key={row.employee.id}><td className="p-3 font-mono font-extrabold">{row.employee.code}</td><td className="p-3 font-bold">{employeeFullName(row.employee)}</td><td className="p-3">{row.employee.nickname || '-'}</td><td className="p-3">{row.employee.position}</td>{ATTENDANCE_STATUS_KEYS.map((status) => <td key={status} className="p-3 font-extrabold text-slate-800">{row.counts[status] || 0}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
      )}

      {detailEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <StockModalHeader title="รายละเอียดพนักงาน" onClose={() => setDetailEmployee(null)} />
            <div className="grid gap-3 text-lg">
              <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <EmployeeAvatar employee={detailEmployee} size="lg" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-500">พนักงาน</p>
                  <p className="break-words text-xl font-extrabold text-slate-950">{employeeFullName(detailEmployee)}</p>
                </div>
              </div>
              <Info label="รหัสพนักงาน" value={detailEmployee.code} />
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-bold text-slate-500">สถานะพนักงาน</p>
                <div className="mt-1"><EmployeeStatusBadge status={detailEmployee.status} /></div>
              </div>
              <Info label="ชื่อจริง" value={detailEmployee.firstName || '-'} />
              <Info label="นามสกุล" value={detailEmployee.lastName || '-'} />
              <Info label="ชื่อเล่น" value={detailEmployee.nickname || '-'} />
              <Info label="ตำแหน่งงาน" value={detailEmployee.position} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function EmployeeInput({ label, value, onChange, type = 'text', placeholder = '', step }) {
  return (
    <label className="block">
      <span className="text-lg font-extrabold text-slate-800">{label}</span>
      <input type={type} step={step} value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-lg text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
    </label>
  );
}

function EmployeeTimeInput({ label, value, onChange, onBlur, disabled = false }) {
  return (
    <label className="block">
      <span className="text-lg font-extrabold text-slate-800">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={5}
        disabled={disabled}
        value={value || ''}
        onBlur={(event) => {
          const nextValue = finalizeTimeInput(event.target.value);
          onChange(nextValue);
          if (onBlur) onBlur(nextValue);
        }}
        onChange={(event) => onChange(normalizeTimeInput(event.target.value))}
        placeholder="09:00"
        className="mt-2 min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 font-mono text-lg text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
      />
    </label>
  );
}

function EmployeeSelect({ label, value, employees, onChange }) {
  return (
    <label className="block">
      <span className="text-lg font-extrabold text-slate-800">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-lg font-bold text-slate-950">
        <option value="">เลือกพนักงาน</option>
        {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.code} - {employeeFullName(employee)} ({employee.nickname || '-'})</option>)}
      </select>
    </label>
  );
}

function EmployeeStatusBadge({ status }) {
  const theme = EMPLOYEE_STATUS_THEME[status] || EMPLOYEE_STATUS_THEME[EMPLOYEE_STATUSES[0]];
  return <StatusBadge label={status || EMPLOYEE_STATUSES[0]} theme={theme} />;
}

function AttendanceStatusBadge({ status }) {
  const theme = ATTENDANCE_STATUS_THEME[status] || ATTENDANCE_STATUS_THEME['มาทำงาน'];
  return <StatusBadge label={status || '-'} theme={theme} />;
}

function StatusBadge({ label, theme }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${theme.badge}`}>
      <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
      {label}
    </span>
  );
}

function MonthOptions() {
  return MONTHS_TH.map((month, index) => <option key={month} value={String(index + 1).padStart(2, '0')}>{month}</option>);
}

function DayOptions() {
  return (
    <>
      <option value="all">ทุกวัน</option>
      {Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0')).map((day) => <option key={day} value={day}>{Number(day)}</option>)}
    </>
  );
}

function AttendanceTable({ rows, onEdit, onDelete }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[1280px] text-left text-base">
        <thead className="bg-slate-100 text-sm font-extrabold text-slate-600">
          <tr><th className="p-3">วันที่</th><th className="p-3">รหัสพนักงาน</th><th className="p-3">ชื่อ-นามสกุล</th><th className="p-3">ชื่อเล่น</th><th className="p-3">ตำแหน่ง</th><th className="p-3">เวลาเข้าเช้า</th><th className="p-3">เวลาออกพักเที่ยง</th><th className="p-3">เวลากลับจากพัก</th><th className="p-3">เวลาออกงานเย็น</th><th className="p-3">สถานะ</th><th className="p-3">ชั่วโมงทำงานรวม</th><th className="p-3 text-right">จัดการ</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((log) => (
            <tr key={log.id} className="hover:bg-slate-50">
              <td className="p-3 font-bold">{dateText(log.date)}</td>
              <td className="p-3 font-mono font-extrabold">{log.employee.code || log.employeeCode || '-'}</td>
              <td className="p-3 font-bold">{employeeFullName(log.employee)}</td>
              <td className="p-3">{log.employee.nickname || '-'}</td>
              <td className="p-3">{log.employee.position || '-'}</td>
              <td className="p-3 font-mono">{timeText(log.morningIn)}</td>
              <td className="p-3 font-mono">{timeText(log.lunchOut)}</td>
              <td className="p-3 font-mono">{timeText(log.afternoonIn)}</td>
              <td className="p-3 font-mono">{timeText(log.eveningOut)}</td>
              <td className="p-3"><AttendanceStatusBadge status={log.status} /></td>
              <td className="p-3 font-extrabold text-emerald-700">{log.hours || 0} ชม.</td>
              <td className="p-3">
                <div className="flex justify-end gap-2">
                  <button className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 font-extrabold text-blue-800 hover:bg-blue-100" onClick={() => onEdit(log)} type="button"><Edit3 className="h-4 w-4" />แก้ไข</button>
                  <button className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 font-extrabold text-rose-700 hover:bg-rose-100" onClick={() => onDelete(log)} type="button"><Trash2 className="h-4 w-4" />ลบ</button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td className="p-8 text-center text-slate-500" colSpan={12}>ยังไม่มีประวัติตอกเวลา</td></tr>}
        </tbody>
      </table>
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
    { level: 'red', title: 'รถเกินกำหนดส่งมอบ', value: `${overdueVehicles.length} คัน` },
    { level: 'yellow', title: 'รถต้องส่งมอบวันนี้', value: `${dueTodayVehicles.length} คัน` },
    { level: 'yellow', title: 'รถรออะไหล่ในร้าน', value: `${waitingPartsVehicles.length} คัน` },
    { level: 'red', title: 'สินค้าในสต็อกหมดคลัง', value: `${outOfStockProducts.length} รายการ` },
    { level: 'yellow', title: 'สินค้าในสต็อกใกล้หมด', value: `${lowStockProducts.length} รายการ` },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            ระบบตรวจสอบโดยรวม
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-1">Executive Dashboard</h2>
        </div>
        <div className="text-slate-500 font-bold text-sm">
          อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH').slice(0, 5)} น.
        </div>
      </div>

      <div>
        <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider mb-3">สถานะรถในร้าน (คลิกเพื่อกรองรายการด้านล่าง)</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {topCards.map((card) => (
            <DashboardCompactCard key={card.title} {...card} active={statusFilter === card.filter} onClick={card.filter ? () => setStatusFilter(card.filter) : undefined} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider mb-3">สรุปผลประกอบการและการเงินประจำเดือน</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {businessCards.map((card) => <DashboardCompactCard key={card.title} {...card} />)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col">
          <div className="mb-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              Notification Panel
            </span>
            <h3 className="text-xl font-extrabold text-slate-950 mt-1">กระดานแจ้งเตือนและรายการวิกฤต</h3>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
            {alerts.map((alert) => {
              const isRed = alert.level === 'red';
              const hasCount = parseInt(alert.value) > 0;
              return (
                <div key={alert.title} className={`flex items-center justify-between rounded-xl border px-4 py-3.5 transition-colors ${hasCount ? (isRed ? 'border-rose-100 bg-rose-50/60 text-rose-950' : 'border-amber-100 bg-amber-50/60 text-amber-950') : 'border-slate-100 bg-slate-50/40 text-slate-400'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${hasCount ? (isRed ? 'bg-rose-600 animate-pulse' : 'bg-amber-500') : 'bg-slate-300'}`} />
                    <p className="text-base font-bold">{alert.title}</p>
                  </div>
                  <p className={`text-lg font-extrabold ${hasCount ? (isRed ? 'text-rose-700' : 'text-amber-700') : 'text-slate-400'}`}>{alert.value}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                Recent Registers
              </span>
              <h3 className="text-xl font-extrabold text-slate-950 mt-1">คิวรับเข้าซ่อมล่าสุด</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">10 ลำดับล่าสุด</span>
          </div>
          <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200/60">
            <table className="w-full min-w-[500px] text-left text-sm sm:text-base">
              <thead className="bg-slate-50 text-xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">เลขที่ใบแจ้งหนี้</th>
                  <th className="p-3.5">ยี่ห้อ / ทะเบียน</th>
                  <th className="p-3.5">ลูกค้า</th>
                  <th className="p-3.5">สถานะ</th>
                  <th className="p-3.5">วันที่รับคิว</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {latestVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3.5 font-mono text-slate-900 font-extrabold">{vehicle.invoice_number || '-'}</td>
                    <td className="p-3.5 leading-tight">
                      <p className="text-slate-900 font-extrabold">{vehicle.brand}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">{vehicle.license_plate}</p>
                    </td>
                    <td className="p-3.5 text-slate-950 font-extrabold">{vehicle.owner_name || '-'}</td>
                    <td className="p-3.5"><StatusPill status={vehicle.status} /></td>
                    <td className="p-3.5 text-slate-500 text-xs font-semibold">{dateText(vehicle.booking_date)}</td>
                  </tr>
                ))}
                {latestVehicles.length === 0 && (
                  <tr>
                    <td className="p-8 text-center text-slate-400" colSpan={5}>
                      ยังไม่มีข้อมูลรถยนต์ในอู่ ณ ขณะนี้
                    </td>
                  </tr>
                )}
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
    blue: 'border-blue-200 bg-blue-50/50 text-blue-900',
    emerald: 'border-emerald-200 bg-emerald-50/50 text-emerald-900',
    rose: 'border-rose-200 bg-rose-50/50 text-rose-900',
    pink: 'border-pink-200 bg-pink-50/50 text-pink-900',
    violet: 'border-violet-200 bg-violet-50/50 text-violet-900',
    amber: 'border-amber-200 bg-amber-50/50 text-amber-900',
    orange: 'border-orange-200 bg-orange-50/50 text-orange-900',
    slate: 'border-slate-200 bg-white text-slate-900',
  };
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      className={`rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 ${tones[tone] || tones.slate} ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-md' : ''} ${active ? 'ring-2 ring-blue-600 border-blue-600 scale-[1.01] glow-primary' : ''}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <div className="flex items-center justify-between gap-3 text-slate-400">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{title}</p>
        <span className="text-slate-400">{React.cloneElement(icon, { className: 'h-4 w-4 stroke-[2.2]' })}</span>
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
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

const BOOKING_DASH = '-';

function readBookingVehicle(vehicle, keys, fallback = BOOKING_DASH) {
  for (const key of keys) {
    const value = vehicle?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return fallback;
}

function bookingDateKey(vehicle) {
  if (!vehicle) return '';
  const dateStr = String(readBookingVehicle(vehicle, ['entryDate', 'booking_date'], '')).slice(0, 10);
  return dateStr === BOOKING_DASH ? '' : dateStr;
}

function bookingTimeText(vehicle) {
  if (!vehicle) return BOOKING_DASH;
  const explicit = readBookingVehicle(vehicle, ['bookingTime', 'booking_time', 'time'], '');
  if (explicit && explicit !== BOOKING_DASH) return String(explicit).slice(0, 5);
  const rawDate = String(readBookingVehicle(vehicle, ['entryDate', 'booking_date'], ''));
  if (rawDate === BOOKING_DASH) return BOOKING_DASH;
  const timePart = rawDate.includes('T') ? rawDate.split('T')[1] : rawDate.slice(11);
  return timePart && timePart.trim() !== '' ? timePart.slice(0, 5) : BOOKING_DASH;
}

function bookingVehicleBrand(vehicle) {
  return readBookingVehicle(vehicle, ['car_brand', 'brand']);
}

function bookingVehicleModel(vehicle) {
  return readBookingVehicle(vehicle, ['car_model', 'model']);
}

function bookingVehicleTitle(vehicle) {
  if (!vehicle) return BOOKING_DASH;
  return [bookingVehicleBrand(vehicle), bookingVehicleModel(vehicle)].filter((value) => value !== BOOKING_DASH).join(' ') || BOOKING_DASH;
}

function bookingLicensePlateText(vehicle) {
  const text = readBookingVehicle(vehicle, ['license_plate', 'licensePlate'], '');
  return text && text !== BOOKING_DASH ? text : 'ไม่ระบุทะเบียน';
}

function bookingVehicleListText(vehicle) {
  if (!vehicle) return BOOKING_DASH;
  const time = bookingTimeText(vehicle);
  const plate = bookingLicensePlateText(vehicle);
  if (time === BOOKING_DASH) return plate;
  return `${time} - ${plate}`;
}

function bookingVehiclesForDate(rows, date) {
  if (!Array.isArray(rows) || !date) return [];
  return rows
    .filter((vehicle) => vehicle && bookingDateKey(vehicle) === date)
    .sort((a, b) => {
      const timeA = bookingTimeText(a);
      const timeB = bookingTimeText(b);
      if (timeA === BOOKING_DASH && timeB === BOOKING_DASH) return 0;
      if (timeA === BOOKING_DASH) return 1;
      if (timeB === BOOKING_DASH) return -1;
      return timeA.localeCompare(timeB);
    });
}

function bookingInvoiceText(vehicle) {
  return String(readBookingVehicle(vehicle, ['invoice_number'], '')).replace(/^#/, '') || BOOKING_DASH;
}

function bookingInvoiceLabel(vehicle) {
  const invoice = bookingInvoiceText(vehicle);
  return invoice === BOOKING_DASH ? BOOKING_DASH : `#${invoice}`;
}

function bookingModalFields(vehicle) {
  return [
    ['เวลา', bookingTimeText(vehicle)],
    ['เลขใบงาน', readBookingVehicle(vehicle, ['invoice_number'])],
    ['สถานะ', readBookingVehicle(vehicle, ['status'])],
    ['ยี่ห้อ', bookingVehicleBrand(vehicle)],
    ['รุ่น', bookingVehicleModel(vehicle)],
    ['ทะเบียน', readBookingVehicle(vehicle, ['license_plate'])],
    ['สี', readBookingVehicle(vehicle, ['color'])],
    ['เจ้าของรถ', readBookingVehicle(vehicle, ['owner_name'])],
    ['เบอร์โทร', readBookingVehicle(vehicle, ['phone'])],
    ['เลขตัวถัง', readBookingVehicle(vehicle, ['vin'])],
    ['เลขไมล์', readBookingVehicle(vehicle, ['mileage'])],
    ['วันที่จอง/วันที่รับรถ', dateText(readBookingVehicle(vehicle, ['entryDate', 'booking_date'], ''))],
    ['กำหนดเสร็จ', dateText(readBookingVehicle(vehicle, ['estimatedCompletion', 'estimated_completion_date'], ''))],
    ['รายละเอียด/อาการ', readBookingVehicle(vehicle, ['status_detail'])],
  ];
}

function BookingCalendar({ vehicles }) {
  const current = currentYearMonth();
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [selectedDate, setSelectedDate] = useState(dateInputValue(new Date()));
  const [detailVehicle, setDetailVehicle] = useState(null);
  const detailPanelRef = useRef(null);
  const bookingRows = useMemo(() => {
    if (!Array.isArray(vehicles)) return [];
    return vehicles.filter((vehicle) => vehicle && vehicle.status === DEFAULT_STATUS);
  }, [vehicles]);
  const selectedDayVehicles = useMemo(() => bookingVehiclesForDate(bookingRows, selectedDate), [bookingRows, selectedDate]);
  
  const gridCells = useMemo(() => {
    const calendarDaysStr = daysInMonth(year, month);
    // Parse using local time to avoid timezone shift
    const [y, m] = [parseInt(year, 10), parseInt(month, 10)];
    const firstDay = new Date(y, m - 1, 1);
    let startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // 0=Mon, 6=Sun
    
    const cells = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ empty: true, id: `empty-start-${i}` });
    }
    
    calendarDaysStr.forEach((date) => {
      cells.push({
        empty: false,
        date,
        id: date,
        vehicles: bookingVehiclesForDate(bookingRows, date),
      });
    });
    
    let endCount = 0;
    while (cells.length % 7 !== 0) {
      cells.push({ empty: true, id: `empty-end-${endCount++}` });
    }
    return cells;
  }, [year, month, bookingRows]);

  const totalBookings = bookingRows.filter((vehicle) => bookingDateKey(vehicle).startsWith(`${year}-${month}`)).length;
  const todayStr = dateInputValue(new Date());

  useEffect(() => {
    if (!detailVehicle) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDetailVehicle(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [detailVehicle]);

  const selectCalendarDate = (date) => {
    setSelectedDate(date);
    window.setTimeout(() => detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm w-full max-w-full min-w-0 overflow-hidden flex flex-col">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950">ปฏิทินจองคิว</h2>
          <p className="text-sm sm:text-lg font-bold text-slate-500">เดือน {MONTHS_TH[parseInt(month, 10) - 1]} ปี {parseInt(year, 10) + 543} ({totalBookings} คิว)</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full lg:w-auto shrink-0">
          <select value={month} onChange={(event) => {
            const nextMonth = event.target.value;
            setMonth(nextMonth);
            setSelectedDate(`${year}-${nextMonth}-01`);
          }} className="min-h-[44px] sm:min-h-12 w-full rounded-lg border border-slate-300 bg-white px-2 sm:px-3 text-sm sm:text-lg">
            {MONTHS_TH.map((item, index) => <option key={item} value={String(index + 1).padStart(2, '0')}>{item}</option>)}
          </select>
          <select value={year} onChange={(event) => {
            const nextYear = event.target.value;
            setYear(nextYear);
            setSelectedDate(`${nextYear}-${month}-01`);
          }} className="min-h-[44px] sm:min-h-12 w-full rounded-lg border border-slate-300 bg-white px-2 sm:px-3 text-sm sm:text-lg">
            {REPORT_YEARS.map((item) => <option key={item} value={String(item)}>{item + 543}</option>)}
          </select>
        </div>
      </div>
      
      <div className="mt-4 flex-1 min-w-0">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-sm font-extrabold text-slate-500 uppercase tracking-wide mb-1 sm:mb-2 shrink-0">
          <div className="pb-1 sm:pb-2">จันทร์</div>
          <div className="pb-1 sm:pb-2">อังคาร</div>
          <div className="pb-1 sm:pb-2">พุธ</div>
          <div className="pb-1 sm:pb-2">พฤหัสบดี</div>
          <div className="pb-1 sm:pb-2">ศุกร์</div>
          <div className="pb-1 sm:pb-2 text-amber-600">เสาร์</div>
          <div className="pb-1 sm:pb-2 text-rose-600">อาทิตย์</div>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr min-w-0">
          {gridCells.map((cell, index) => {
            if (cell.empty) {
              return <div key={cell.id} className="rounded-lg bg-slate-50/50 border border-slate-100 min-h-[60px] sm:min-h-[100px]" />;
            }
            
            const hasBookings = cell.vehicles.length > 0;
            const previewLimit = 3;
            const mobilePreviewVehicles = cell.vehicles.slice(0, previewLimit);
            const isToday = cell.date === todayStr;
            const isWeekend = index % 7 === 5 || index % 7 === 6;
            const isSelected = cell.date === selectedDate;
            
            return (
              <button
                type="button"
                key={cell.id} 
                onClick={() => selectCalendarDate(cell.date)}
                className={`flex flex-col rounded-lg border p-1 sm:p-2 min-h-[72px] sm:min-h-[128px] min-w-0 overflow-hidden text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' :
                  isToday ? 'border-blue-400 bg-blue-50/30 ring-1 ring-blue-400' : 
                  hasBookings ? 'border-indigo-200 bg-indigo-50/40' : 
                  isWeekend ? 'border-slate-100 bg-slate-50 hover:bg-slate-100' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5 sm:mb-1 shrink-0">
                  <span className={`text-xs sm:text-base font-extrabold ${isToday ? 'text-blue-700' : hasBookings ? 'text-indigo-900' : 'text-slate-600'}`}>
                    {Number(cell.date.slice(8, 10))}
                  </span>
                  {hasBookings && (
                    <span className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-indigo-600 text-[9px] sm:text-[11px] font-bold text-white shrink-0">
                      {cell.vehicles.length}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col gap-0.5 sm:gap-1 min-w-0 overflow-hidden">
                  {hasBookings ? (
                    <>
                      {mobilePreviewVehicles.map((v, i) => (
                        <div key={v?.id || i} className="rounded border border-indigo-200/60 bg-white px-1 py-0.5 sm:px-1.5 sm:py-1 shrink-0 min-w-0" title={bookingVehicleListText(v)}>
                          <p className="text-[9px] sm:text-xs font-bold text-slate-800 truncate leading-tight">{bookingVehicleListText(v)}</p>
                        </div>
                      ))}
                      {cell.vehicles.length > previewLimit && (
                        <div className="text-[9px] sm:text-xs font-bold text-indigo-600 mt-auto truncate text-center">+{cell.vehicles.length - previewLimit}</div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[10px] sm:text-sm text-slate-300 font-medium">—</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div ref={detailPanelRef} className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-5 min-w-0">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-2xl font-extrabold text-slate-950 leading-tight">รายการจองคิว วันที่ {dateText(selectedDate)}</h3>
            <p className="text-sm font-bold text-slate-500">{selectedDayVehicles.length} คัน</p>
          </div>
        </div>
        {selectedDayVehicles.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {selectedDayVehicles.map((vehicle) => (
              <button
                type="button"
                key={vehicle.id || `${selectedDate}-${bookingInvoiceText(vehicle)}`}
                className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:p-4"
                onClick={() => setDetailVehicle(vehicle)}
              >
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-base sm:text-lg font-extrabold text-slate-950 truncate">เวลา: {bookingTimeText(vehicle)}</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-500 truncate">ใบงาน: {bookingInvoiceLabel(vehicle)}</p>
                  </div>
                  <span className="text-sm font-extrabold text-blue-700 shrink-0">ดูรายละเอียด</span>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  {[
                    ['รถ', bookingVehicleTitle(vehicle)],
                    ['ทะเบียน', readBookingVehicle(vehicle, ['license_plate'])],
                    ['เจ้าของ', readBookingVehicle(vehicle, ['owner_name'])],
                    ['เบอร์โทร', readBookingVehicle(vehicle, ['phone'])],
                    ['สถานะ', readBookingVehicle(vehicle, ['status'])],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="font-bold text-slate-400">{label}</dt>
                      <dd className="mt-0.5 font-extrabold text-slate-900 break-words">{value || BOOKING_DASH}</dd>
                    </div>
                  ))}
                </dl>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm sm:text-base font-bold text-slate-500">ไม่มีรายการจองคิวในวันนี้</div>
        )}
      </div>
      {detailVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6" onClick={() => setDetailVehicle(null)}>
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl min-w-0" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 sm:p-5 shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-2xl font-extrabold text-slate-950 leading-tight">รายละเอียดจองคิว วันที่ {dateText(selectedDate)}</h3>
                <p className="text-sm sm:text-base font-bold text-slate-500">{bookingTimeText(detailVehicle)} {bookingVehicleTitle(detailVehicle)}</p>
              </div>
              <button type="button" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" onClick={() => setDetailVehicle(null)} aria-label="ปิด">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-5">
              <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {bookingModalFields(detailVehicle).map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
                    <dt className="text-xs font-bold text-slate-500">{label}</dt>
                    <dd className="mt-0.5 text-sm font-extrabold text-slate-900 break-words">{value || BOOKING_DASH}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}
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
      <div className="max-w-full overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px] text-left text-base md:min-w-[860px] md:text-lg">
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

  const inShopPieRows = useMemo(() => [
    { name: 'รถค้างในร้าน', value: vehicles.filter(isInShop).length, color: '#f59e0b' },
    { name: 'รถปิดงานแล้ว', value: vehicles.filter(v => normalizeVehicleStatus(v.status) === CLOSED_STATUS).length, color: '#10b981' },
  ], [vehicles]);

  const [employeesData, setEmployeesData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  useEffect(() => {
    const token = window.localStorage.getItem('jbm_admin_token') || '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    fetch('/api/employees', { headers })
      .then(r => r.json())
      .then(d => { if (d && d.employees) setEmployeesData(d.employees); })
      .catch(() => {});

    fetch('/api/employee-attendance', { headers })
      .then(r => r.json())
      .then(d => { if (d && d.logs) setAttendanceData(d.logs); })
      .catch(() => {});
  }, []);

  const employeeStatusRows = useMemo(() => {
    const counts = (employeesData || []).reduce((acc, emp) => {
      acc[emp.status] = (acc[emp.status] || 0) + 1;
      return acc;
    }, {});
    if (Object.keys(counts).length === 0) return [];
    return Object.keys(counts).map(status => ({
      name: status || 'ไม่ระบุ',
      value: counts[status],
      color: status === 'ทำงานอยู่' ? '#10b981' : '#f43f5e'
    }));
  }, [employeesData]);

  const attendanceStatusRows = useMemo(() => {
    const currentMonthPrefix = dateInputValue(new Date()).slice(0, 7);
    const counts = (attendanceData || []).filter(log => String(log.date || '').startsWith(currentMonthPrefix)).reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {});
    if (Object.keys(counts).length === 0) return [];
    return Object.keys(counts).map(status => ({
      name: status || 'ไม่ระบุ',
      value: counts[status],
      color: status === 'มาทำงาน' ? '#10b981' : (status === 'ขาดงาน' ? '#f43f5e' : '#f59e0b')
    }));
  }, [attendanceData]);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-950">Management Dashboard</h2>
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

      <div className="grid gap-5 xl:grid-cols-3">
        <ManagementPanel title="สถานะรถในระบบทั้งหมด">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={inShopPieRows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100}>
                  {inShopPieRows.map((row) => <Cell key={row.name} fill={row.color} />)}
                </Pie>
                <Tooltip formatter={(value) => `${value} คัน`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ManagementPanel>

        <ManagementPanel title="สถานะพนักงาน">
          <div className="h-72">
            {employeeStatusRows.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={employeeStatusRows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100}>
                    {employeeStatusRows.map((row) => <Cell key={row.name} fill={row.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} คน`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold">ยังไม่มีข้อมูลสำหรับแสดงกราฟ</div>
            )}
          </div>
        </ManagementPanel>

        <ManagementPanel title="สถานะลงเวลาเดือนนี้">
          <div className="h-72">
            {attendanceStatusRows.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={attendanceStatusRows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100}>
                    {attendanceStatusRows.map((row) => <Cell key={row.name} fill={row.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} ครั้ง`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold">ยังไม่มีข้อมูลสำหรับแสดงกราฟ</div>
            )}
          </div>
        </ManagementPanel>
      </div>
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
  const [brandMode, setBrandMode] = useState(!initial.brand || (BRAND_OPTIONS.includes(initial.brand) && initial.brand !== OTHER_OPTION) ? 'select' : 'custom');
  const [modelMode, setModelMode] = useState('select');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const next = normalizeVehicle(initial);
    setForm(next);
    setBrandMode(!next.brand || (BRAND_OPTIONS.includes(next.brand) && next.brand !== OTHER_OPTION) ? 'select' : 'custom');
    setModelMode(!next.model || ((MODEL_OPTIONS[next.brand] || []).includes(next.model) && next.model !== OTHER_OPTION) ? 'select' : 'custom');
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
    <form onSubmit={submit} className="max-w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] sm:p-6">
      <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950">เพิ่มหรือแก้ไขข้อมูลรถยนต์</h2>
          <p className="mt-1.5 text-sm font-bold text-slate-500">กรอกข้อมูลคิวซ่อมและข้อมูลรถ</p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center w-full lg:w-auto">
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50 transition-colors flex-1 sm:flex-none" onClick={onCancel} type="button">
            <X className="h-4 w-4" />
            ยกเลิก
          </button>
          <button className="hidden lg:inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-600 transition-all-300" type="submit">
            <Save className="h-4 w-4" />
            {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-5 flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 text-sm font-bold">
          <span>!</span>
          <p>{error}</p>
        </div>
      )}

      <div className="grid max-w-full gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <FormSection title="ข้อมูลรถยนต์">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="ทะเบียนรถ" value={form.license_plate} onChange={(value) => update('license_plate', value)} />
              <BrandField form={form} update={update} mode={brandMode} setMode={setBrandMode} />
              <ModelField form={form} update={update} mode={modelMode} setMode={setModelMode} choices={modelChoices} />
              <Field label="สีรถ" value={form.color} onChange={(value) => update('color', value)} />
              <Field label="VIN / เลขตัวถัง" value={form.vin} onChange={(value) => update('vin', value)} />
              <Field label="ระยะทางวิ่ง (กม.)" type="number" value={form.mileage} onChange={(value) => update('mileage', value)} />
            </div>
          </FormSection>

          <FormSection title="ข้อมูลลูกค้า">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ชื่อลูกค้า" value={form.owner_name} onChange={(value) => update('owner_name', value)} />
              <Field label="เบอร์โทรศัพท์" value={form.phone} onChange={(value) => update('phone', value)} />
            </div>
          </FormSection>

          <FormSection title="ข้อมูลการบริการและงานซ่อม">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="เลขใบแจ้งหนี้/ใบเสร็จ" value={form.invoice_number} onChange={(value) => update('invoice_number', value)} />
              <SelectField label="สถานะรถ" value={form.status} onChange={(value) => update('status', value)} options={STATUS_OPTIONS} />
              <Field label="ประเมินราคาค่าซ่อม" type="number" value={form.repair_cost} onChange={(value) => update('repair_cost', value)} />
              <Field label="วันที่จองคิวซ่อม" type="date" value={form.entryDate} onChange={(value) => { update('entryDate', value); update('booking_date', value); }} />
              <Field label="เวลาจองคิว" type="time" value={form.booking_time || form.bookingTime || ''} onChange={(value) => { update('booking_time', value); update('bookingTime', value); }} />
              <Field label="วันที่กำหนดส่งคืน" type="date" value={form.estimatedCompletion} onChange={(value) => { update('estimatedCompletion', value); update('estimated_completion_date', value); }} />
            </div>
            <div className="mt-4">
              <TextArea label="รายละเอียดอาการและประวัติซ่อม" value={form.status_detail} onChange={(value) => update('status_detail', value)} />
            </div>
          </FormSection>

          <FormSection title="รูปภาพประกอบงานซ่อม/เอกสารใบเสร็จ">
            <div className="grid gap-4 sm:grid-cols-[auto_1fr] items-start">
              <label className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-50 hover:bg-blue-100 px-5 text-sm font-extrabold text-blue-700 border border-blue-200 transition-colors">
                <ImagePlus className="h-4 w-4 stroke-[2.5]" />
                อัปโหลดรูปภาพ
                <input className="hidden" type="file" accept="image/*" multiple onChange={uploadImage} />
              </label>
              <div className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4">
                {vehicleImages(form).length > 0 ? (
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    {vehicleImages(form).map((image, index) => (
                      <div key={`${image}-${index}`} className="rounded-xl border border-slate-200 bg-white p-2 relative group shadow-sm">
                        <img className="h-24 w-full rounded-lg bg-slate-50 object-contain" src={image} alt={`รูปประกอบรถ ${index + 1}`} loading="lazy" />
                        <button className="mt-2 inline-flex min-h-8 w-full items-center justify-center rounded-lg border border-rose-200 bg-rose-50/80 px-3 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition-colors" onClick={() => removeImage(image)} type="button">
                          ลบรูปนี้
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-400 text-center py-2">ยังไม่มีรูปภาพประกอบในเคสนี้</p>
                )}
              </div>
            </div>
          </FormSection>
          
          <button className="lg:hidden mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-base font-extrabold text-white shadow-md hover:bg-blue-600 transition-all-300" type="submit">
            <Save className="h-5 w-5" />
            {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm lg:sticky lg:top-20 space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-200 pb-3">สรุปข้อมูลเคสซ่อม</h3>
          <div className="space-y-3">
            <FormSummaryRow label="ทะเบียนรถ" value={form.license_plate || '-'} />
            <FormSummaryRow label="ชื่อลูกค้า" value={form.owner_name || '-'} />
            <FormSummaryRow label="ยี่ห้อ / รุ่นรถ" value={`${form.brand || '-'} ${form.model || ''}`.trim() || '-'} />
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-bold text-slate-500">สถานะปัจจุบัน</p>
              <div className="mt-2"><StatusPill status={form.status} /></div>
            </div>
            <FormSummaryRow label="ประเมินราคาค่าซ่อม" value={form.repair_cost ? `฿${money(form.repair_cost)}` : '-'} />
            <FormSummaryRow label="วันที่จองคิว" value={form.entryDate ? dateText(form.entryDate) : '-'} />
            <FormSummaryRow label="วันที่กำหนดส่งคืน" value={form.estimatedCompletion ? dateText(form.estimatedCompletion) : '-'} />
          </div>
        </aside>
      </div>
    </form>
  );
}


function FormSection({ title, children }) {
  return (
    <section className="max-w-full rounded-2xl border border-slate-200/80 bg-slate-50/30 p-4">
      <h3 className="text-base font-extrabold text-slate-900 border-l-3 border-blue-600 pl-2.5">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function FormSummaryRow({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-base font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function BrandField({ form, update, mode, setMode }) {
  return (
    <div>
      <span className="text-xs font-extrabold text-slate-600">ยี่ห้อรถยนต์</span>
      <div className="mt-1 grid gap-1.5">
        {mode === 'select' ? (
          <select
            value={BRAND_OPTIONS.includes(form.brand) ? form.brand : OTHER_OPTION}
            onChange={(event) => {
              const value = event.target.value;
              if (value === OTHER_OPTION) {
                setMode('custom');
                update('brand', '');
                update('model', '');
              } else {
                update('brand', value);
                update('model', MODEL_OPTIONS[value]?.[0] || '');
              }
            }}
            className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">เลือกยี่ห้อ</option>
            {BRAND_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : (
          <input value={form.brand || ''} onChange={(event) => update('brand', event.target.value)} className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="พิมพ์ยี่ห้อเอง" />
        )}
        <button className="min-h-8 justify-self-start rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-extrabold text-blue-700 hover:bg-blue-50" type="button" onClick={() => setMode(mode === 'select' ? 'custom' : 'select')}>
          {mode === 'select' ? 'พิมพ์ยี่ห้อเอง' : 'เลือกจากรายการ'}
        </button>
      </div>
    </div>
  );
}

function ModelField({ form, update, mode, setMode, choices }) {
  const hasChoices = choices.length > 0;
  return (
    <div>
      <span className="text-xs font-extrabold text-slate-600">รุ่นรถยนต์</span>
      <div className="mt-1 grid gap-1.5">
        {mode === 'select' && hasChoices ? (
          <select value={choices.includes(form.model) ? form.model : ''} onChange={(event) => {
            const value = event.target.value;
            if (value === OTHER_OPTION) {
              setMode('custom');
              update('model', '');
            } else {
              update('model', value);
            }
          }} className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
            <option value="">เลือกรุ่น</option>
            {choices.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : (
          <input value={form.model || ''} onChange={(event) => update('model', event.target.value)} className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="พิมพ์รุ่นเอง" />
        )}
        <button className="min-h-8 justify-self-start rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-extrabold text-blue-700 hover:bg-blue-50" type="button" onClick={() => setMode(mode === 'select' ? 'custom' : 'select')}>
          {mode === 'select' ? 'พิมพ์รุ่นเอง' : 'เลือกจากรายการ'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-xs font-extrabold text-slate-600">{label}</span>
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs font-extrabold text-slate-600">{label}</span>
      <select value={value || DEFAULT_STATUS} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <div className="mt-1.5"><StatusPill status={value || DEFAULT_STATUS} /></div>
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-extrabold text-slate-600">{label}</span>
      <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
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
    <section className="space-y-6">
      <SummaryGrid stats={stats} compact activeFilter={statusFilter} onFilter={setStatusFilter} />
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-950">{title}</h2>
            <p className="text-sm font-bold text-slate-500 mt-1">แสดงผลรวม {vehicles.length} รายการตามเงื่อนไขการกรอง</p>
          </div>
          <div>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-600 px-5 text-sm font-extrabold text-white shadow-md shadow-blue-500/10 transition-all-300 hover:scale-[1.02] active:scale-[0.98] w-full xl:w-auto" onClick={onAdd} type="button">
              <Plus className="h-4 w-4 stroke-[2.2]" />
              ลงทะเบียนเคสซ่อม / จองคิวใหม่
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-bold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="ค้นหาชื่อ ทะเบียน เบอร์โทร เลขใบแจ้งหนี้ VIN" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800">
            <option value="all">ทุกสถานะงานซ่อม</option>
            <option value="inShop">เฉพาะรถค้างซ่อมในร้าน</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select value={filters.day} onChange={(event) => setFilters({ ...filters, day: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800">
            <option value="all">ทุกวัน</option>
            {Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0')).map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
          <select value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800">
            <option value="all">ทุกเดือน</option>
            {MONTHS_TH.map((month, index) => <option key={month} value={String(index + 1).padStart(2, '0')}>{month}</option>)}
          </select>
          <select value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800">
            <option value="all">ทุกปี</option>
            {REPORT_YEARS.map((year) => <option key={year} value={String(year)}>{year + 543}</option>)}
          </select>
        </div>

        <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[1000px] text-left text-sm md:text-base">
            <thead className="bg-slate-50 text-xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">ข้อมูลรถ / เลขที่ใบซ่อม</th>
                <th className="p-4">เจ้าของรถ</th>
                <th className="p-4">สถานะปัจจุบัน</th>
                <th className="p-4">วันจอง - กำหนดเสร็จ</th>
                <th className="p-4 text-right">ค่าซ่อมประเมิน</th>
                <th className="p-4">รูปงานซ่อม</th>
                <th className="p-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
              {vehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="cursor-pointer transition hover:bg-slate-50/50"
                  onClick={() => onDetail(vehicle)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onDetail(vehicle);
                    }
                  }}
                  tabIndex={0}
                  title="คลิกเพื่อดูรายละเอียดอย่างละเอียด"
                >
                  <td className="p-4 leading-tight">
                    <p className="font-mono text-slate-900 font-extrabold">{vehicle.invoice_number || '-'}</p>
                    <p className="text-slate-950 font-bold mt-1">{vehicle.license_plate}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{vehicle.brand} {vehicle.model}</p>
                    <p className="font-mono text-xs font-semibold text-slate-400 mt-1">VIN: {vehicle.vin || '-'}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-slate-900 font-extrabold">{vehicle.owner_name || '-'}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{vehicle.phone || '-'}</p>
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <StatusPill status={vehicle.status} />
                    {vehicle.status !== CLOSED_STATUS && (
                      <div className="mt-2.5">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">เปลี่ยนสถานะด่วน</span>
                        <div className="flex flex-wrap gap-1">
                          {STATUS_OPTIONS.map((status, index) => {
                            const isCurrent = vehicle.status === status;
                            return (
                              <button
                                key={status}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onStatus(vehicle, status);
                                }}
                                className={`h-7 w-7 rounded-lg text-xs font-extrabold flex items-center justify-center border transition-all ${isCurrent ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : STATUS_THEME[status].button}`}
                                type="button"
                                title={status}
                              >
                                {index + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed">
                    <p><span className="text-slate-400 font-bold">รับรถ:</span> {dateText(vehicle.booking_date)}</p>
                    <p className="mt-0.5"><span className="text-slate-400 font-bold">ส่งมอบ:</span> {dateText(vehicle.estimated_completion_date)}</p>
                  </td>
                  <td className="p-4 text-right font-extrabold text-emerald-600 text-base">฿{money(vehicle.repair_cost)}</td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1.5">
                      {vehicleImages(vehicle).length > 0 ? (
                        <div className="flex items-center gap-2">
                          <img className="h-10 w-12 rounded-lg border border-slate-200 object-cover" src={vehicleImages(vehicle)[0]} alt="รูปประกอบรถ" loading="lazy" />
                          <a className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100" href={vehicleImages(vehicle)[0]} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-3 w-3" />
                            ดูรูป ({vehicleImages(vehicle).length})
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">ยังไม่มีรูปภาพ</span>
                      )}
                      
                      <label className="inline-flex h-8 w-fit cursor-pointer items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/50 px-2.5 text-xs font-extrabold text-blue-800 hover:bg-blue-100">
                        <ImagePlus className="h-3 w-3 stroke-[2]" />
                        {uploadingId === vehicle.id ? 'กำลังโหลด' : 'เพิ่มรูป'}
                        <input
                          className="hidden"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => onUpload(vehicle, event.target.files)}
                        />
                      </label>
                    </div>
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      <button
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
                        onClick={() => onDetail(vehicle)}
                        type="button"
                      >
                        <Eye className="h-4 w-4" />
                        ดูเคส
                      </button>
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-700 hover:bg-blue-50"
                        onClick={() => onEdit(vehicle)}
                        type="button"
                        title="แก้ไขข้อมูล"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                        onClick={() => onDelete(vehicle.id)}
                        type="button"
                        title="ลบเคสซ่อม"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td className="p-8 text-center text-slate-400 font-bold" colSpan={7}>
                    ไม่พบข้อมูลรายการรถยนต์ตามตัวกรองนี้
                  </td>
                </tr>
              )}
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
  const exportFinancialTransactions = () => {
    downloadCsv(
      `financial-transactions-${filterSegment(filters.year)}-${filterSegment(filters.month)}.csv`,
      [
        { key: 'date', label: 'วันที่' },
        { key: 'time', label: 'เวลา' },
        { key: 'type', label: 'ประเภท' },
        { key: 'payment_method', label: 'ช่องทาง' },
        { key: 'description', label: 'รายละเอียด' },
        { key: 'amount', label: 'จำนวนเงิน' },
      ],
      transactions.map((transaction) => ({
        date: String(transaction.date || '').slice(0, 10),
        time: transaction.time || '-',
        type: transaction.type === 'income' ? 'รายรับ' : 'รายจ่าย',
        payment_method: transaction.payment_method || '-',
        description: transaction.description || '-',
        amount: Number(transaction.amount || 0),
      })),
    );
  };

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
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 text-xl font-extrabold text-emerald-800 hover:bg-emerald-100" onClick={exportFinancialTransactions} type="button">
              <Download className="h-6 w-6" />
              Export CSV
            </button>
            <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-xl font-extrabold text-white hover:bg-blue-800" onClick={() => setEditing({ ...emptyFinancialTransaction })} type="button">
              <Plus className="h-6 w-6" />
              เพิ่มรายการธุรกรรม
            </button>
          </div>
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

        <div className="max-w-full overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-base md:min-w-[980px] md:text-lg">
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
        <h2 className="mb-4 text-2xl font-extrabold text-slate-950">สรุปรายปี พ.ศ. {REPORT_YEAR_RANGE_LABEL}</h2>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-[calc(100vw-1rem)] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:max-w-3xl sm:rounded-2xl sm:p-5" role="dialog" aria-modal="true">
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
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/60 backdrop-blur-sm p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-[calc(100vw-1rem)] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-5xl sm:rounded-3xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="vehicle-detail-title">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 mb-2">
              สรุปผลเคสซ่อมรถยนต์
            </span>
            <h2 id="vehicle-detail-title" className="text-2xl sm:text-3xl font-extrabold text-slate-950">{vehicle.invoice_number || 'ยังไม่มีเลขใบซ่อม'}</h2>
            <p className="text-base sm:text-lg font-bold text-slate-500 mt-1">
              ทะเบียนรถ: <span className="text-slate-900 font-extrabold">{vehicle.license_plate || '-'}</span> | {vehicle.brand || '-'} {vehicle.model || ''}
            </p>
          </div>
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors" onClick={onClose} type="button" aria-label="ปิดรายละเอียด">
            <X className="h-5 w-5 stroke-[2.2]" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="เลขใบแจ้งหนี้/ใบเสร็จ" value={vehicle.invoice_number || '-'} />
          <Info label="ทะเบียนรถยนต์" value={vehicle.license_plate || '-'} />
          <Info label="ชื่อเจ้าของรถ" value={vehicle.owner_name || '-'} />
          <Info label="เบอร์โทรศัพท์ลูกค้า" value={vehicle.phone || '-'} />
          <Info label="ยี่ห้อรถยนต์" value={vehicle.brand || '-'} />
          <Info label="รุ่นรถยนต์" value={vehicle.model || '-'} />
          <Info label="สีตัวถังรถ" value={vehicle.color || '-'} />
          <Info label="VIN / เลขตัวถังรถ" value={vehicle.vin || '-'} />
          <Info label="ระยะทางวิ่ง (เลขไมล์)" value={vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString('th-TH')} กม.` : '-'} />
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">สถานะรถในร้าน</p>
            <StatusPill status={vehicle.status} />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">ประเมินราคาค่าบริการ</p>
            <p className="text-lg font-extrabold text-emerald-600 mt-1">฿{money(vehicle.repair_cost)}</p>
          </div>
          <Info label="วันที่รับรถเข้าจอง" value={dateText(vehicle.booking_date)} />
          <Info label="วันที่กำหนดส่งมอบรถ" value={dateText(vehicle.estimated_completion_date)} />
        </div>

        {vehicle.status_detail && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">รายละเอียดงานซ่อมและบันทึกประวัติ</p>
            <p className="text-base font-bold text-slate-900 mt-1.5 leading-relaxed">{vehicle.status_detail}</p>
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-extrabold text-slate-500 uppercase tracking-wider">รูปภาพประกอบเคสงานซ่อม</p>
          {vehicleImages(vehicle).length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {vehicleImages(vehicle).map((image, index) => (
                <div key={`${image}-${index}`} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <div className="overflow-hidden rounded-lg bg-white aspect-video flex items-center justify-center">
                    <img className="max-h-[200px] object-contain transition-transform duration-300 group-hover:scale-102" src={image} alt={`รูปประกอบการซ่อม ${index + 1}`} loading="lazy" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">รูปภาพที่ {index + 1}</span>
                    <a className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 px-3.5 text-xs font-extrabold text-white transition-colors" href={image} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-3.5 w-3.5" />
                      เปิดดูรูปขนาดเต็ม
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-sm font-bold text-slate-400">ยังไม่มีรูปภาพประกอบในประวัติเคสนี้</p>
            </div>
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

