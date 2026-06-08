'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Car,
  Wrench,
  Clock,
  CheckCircle2,
  Search,
  FileText,
  Upload,
  Plus,
  Trash2,
  Lock,
  Settings,
  Phone,
  MapPin,
  ShieldCheck,
  Calendar,
  DollarSign,
  Sparkles,
  Info,
  AlertCircle,
  TrendingUp,
  X,
  Edit2,
  UserCog,
  EyeOff
} from 'lucide-react';

const API_URL = '/api/vehicles';
const REPORT_START_YEAR = 2025;
const REPORT_YEAR_COUNT = 12;
const REPORT_YEARS = Array.from({ length: REPORT_YEAR_COUNT }, (_, index) => REPORT_START_YEAR + index);
const VALID_STATUS_CODES = new Set([1, 2, 3, 4, 5]);

const CAR_BRANDS = [
  { name: 'Mercedes-Benz', logoSlug: 'mercedes-benz', color: 'border-slate-300 text-slate-200' },
  { name: 'BMW', logoSlug: 'bmw', color: 'border-blue-600 text-blue-400' },
  { name: 'Audi', logoSlug: 'audi', color: 'border-red-500 text-red-400' },
  { name: 'Volvo', logoSlug: 'volvo', color: 'border-cyan-500 text-cyan-300' },
  { name: 'Porsche', logoSlug: 'porsche', color: 'border-yellow-600 text-yellow-500' },
  { name: 'MINI', logoSlug: 'mini', color: 'border-emerald-600 text-emerald-400' }
];

const SOCIAL_LOGOS = {
  facebook: 'https://thesvg.org/icons/facebook/default.svg',
  instagram: 'https://thesvg.org/icons/instagram/default.svg',
  line: 'https://thesvg.org/icons/line/default.svg',
};

const BRAND_SUGGESTIONS = {
  'Mercedes-Benz': ['C-Class C300e', 'E-Class E300e', 'S-Class S580e', 'GLC AMG 250d', 'GLA200'],
  BMW: ['Series 3 330e M Sport', 'Series 5 530e M Sport', 'iX3 M Sport', 'i7 xDrive60', 'M3 Competition'],
  Audi: ['Q7 e-tron', 'Q5 Sportback', 'RS e-tron GT', 'TT Coupe 45 TFSI', 'A4 Avant'],
  Volvo: ['XC90 Recharge', 'XC60 T8', 'V60 Recharge', 'C40 Recharge', 'XC40 Pure Electric'],
  Porsche: ['Taycan 4S', '911 Carrera S', 'Cayenne E-Hybrid', 'Panamera 4 E-Hybrid', 'Macan GTS'],
  MINI: ['Cooper SE', 'Countryman JCW', 'Hatch 3-Door']
};

const STATUS_DETAILS = {
  1: { name: 'จองคิว', color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30' },
  2: { name: 'เช็ครถ', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  3: { name: 'รออะไหล่', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  4: { name: 'กำลังซ่อม', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
  5: { name: 'เสร็จรอส่ง', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
};

const normalizeStatusCode = (value) => {
  const status = Number.parseInt(value, 10);
  return VALID_STATUS_CODES.has(status) ? status : 1;
};

const getStatusDetail = (status) => STATUS_DETAILS[normalizeStatusCode(status)];

const toVehicleCost = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(Math.round(value), 0) : 0;
  }

  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
  if (!cleaned) return 0;

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? Math.max(Math.round(parsed), 0) : 0;
};

const MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const formatThaiDate = (dateStr) => {
  if (!dateStr || dateStr === '0000-00-00') return 'ไม่ได้ระบุ';
  try {
    const parts = dateStr.toString().split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10) + 543;
    const month = MONTHS_TH[parseInt(parts[1], 10) - 1] || dateStr;
    const day = parseInt(parts[2], 10);
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

const formatReceiptDisplay = (receiptNo) => (receiptNo ? receiptNo : '-');

const normalizeMileage = (value) => {
  const parsed = Number.parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : null;
};

const normalizeVehicleForDb = (vehicle) => ({
  ...vehicle,
  status: normalizeStatusCode(vehicle.status),
  mileage: normalizeMileage(vehicle.mileage),
  cost: toVehicleCost(vehicle.cost),
  entryDate: vehicle.entryDate || null,
  estimatedCompletion: vehicle.estimatedCompletion || null,
  logs: Array.isArray(vehicle.logs) ? vehicle.logs : []
});

const normalizeVehicleFromApi = (vehicle = {}) => ({
  ...vehicle,
  status: normalizeStatusCode(vehicle?.status),
  mileage: normalizeMileage(vehicle?.mileage),
  cost: toVehicleCost(vehicle?.cost),
  logs: Array.isArray(vehicle?.logs) ? vehicle.logs : []
});

const normalizeVehiclesFromApi = (data) => (Array.isArray(data) ? data.map(normalizeVehicleFromApi) : []);

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [vehicles, setVehicles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');
  const [dateStatusFilter, setDateStatusFilter] = useState('all');
  const [filterDay, setFilterDay] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [adminTokenInput, setAdminTokenInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ show: false, message: '', onConfirm: null });
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [customModelMode, setCustomModelMode] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('Mercedes-Benz');
  const [formState, setFormState] = useState({
    receiptNo: '',
    ownerName: '',
    phone: '',
    plateNo: '',
    brand: 'Mercedes-Benz',
    model: '',
    color: '',
    status: 1,
    statusText: '',
    entryDate: '2026-06-05',
    bookingTime: '',
    estimatedCompletion: '',
    mileage: '',
    cost: 0,
    vin: '',
    receiptName: null,
    receiptUrl: null,
    logs: []
  });

  const [isLoading, setIsLoading] = useState(true);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    window.setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const getAdminHeaders = useCallback((token = adminToken) => {
    if (!token) return {};
    return { 'x-vehicle-admin-token': token };
  }, [adminToken]);

  const fetchVehiclesFromServer = useCallback(async (token = adminToken) => {
    try {
      const isAdminRequest = Boolean(token);
      const res = await fetch(isAdminRequest ? `${API_URL}?admin=1` : API_URL, {
        headers: getAdminHeaders(token),
      });
      if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลจากเซิร์ฟเวอร์ได้');
      const data = await res.json();
      return normalizeVehiclesFromApi(data);
    } catch (err) {
      console.error('[vehicles] fetch failed', err);
      return [];
    }
  }, [adminToken, getAdminHeaders]);

  const refreshVehicles = useCallback(async (token = adminToken) => {
    setIsLoading(true);
    const data = await fetchVehiclesFromServer(token);
    setVehicles(Array.isArray(data) ? data : []);
    setIsLoading(false);
  }, [adminToken, fetchVehiclesFromServer]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const token = adminTokenInput.trim();
    if (!token) {
      setAdminLoginError('กรุณากรอกรหัสพนักงาน');
      return;
    }

    setAdminLoginError('');
    setIsLoading(true);
    try {
      const validateResponse = await fetch('/api/admin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: token }),
      });
      const validateData = await validateResponse.json();
      if (!validateResponse.ok) {
        throw new Error(validateData?.error || 'รหัสพนักงานไม่ถูกต้อง');
      }

      setAdminToken(token);
      setIsAdminLoggedIn(true);
      setActiveTab('admin');
      setAdminTokenInput('');

      try {
        await refreshVehicles(token);
      } catch (refreshError) {
        console.error('[vehicles] refresh after login failed', refreshError);
        showToast('เข้าสู่ระบบแล้ว แต่ไม่สามารถดึงข้อมูลหลังบ้านได้', 'error');
      }

      showToast('เข้าสู่ระบบพนักงานเรียบร้อย', 'success');
    } catch (error) {
      console.error('[vehicles] admin login failed', error);
      const message = String(error?.message || 'รหัสพนักงานไม่ถูกต้อง');
      setAdminLoginError(message.includes('ไม่ถูกต้อง') ? 'รหัสพนักงานไม่ถูกต้อง' : 'ระบบตรวจสอบรหัสพนักงานไม่พร้อมใช้งาน');
      setIsAdminLoggedIn(false);
      setAdminToken('');
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setAdminToken('');
    setVehicles([]);
    setActiveTab('home');
    showToast('ออกจากระบบพนักงานแล้ว', 'success');
  };

  const saveVehicleToServer = async (vehicle) => {
    if (!adminToken) {
      showToast('กรุณาเข้าสู่ระบบพนักงานก่อนบันทึกข้อมูล', 'error');
      return null;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify(normalizeVehicleForDb(vehicle)),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }
      return result;
    } catch (err) {
      console.error('[vehicles] save failed', err);
      showToast('ไม่สามารถบันทึกข้อมูลไปยังฐานข้อมูลได้', 'error');
      return null;
    }
  };

  const deleteVehicleFromServer = async (id) => {
    if (!adminToken) {
      showToast('กรุณาเข้าสู่ระบบพนักงานก่อนลบข้อมูล', 'error');
      return false;
    }

    try {
      const response = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'ลบข้อมูลไม่สำเร็จ');
      }
      return true;
    } catch (err) {
      console.error('[vehicles] delete failed', err);
      showToast('ไม่สามารถลบข้อมูลจากฐานข้อมูลได้', 'error');
      return false;
    }
  };

  useEffect(() => {
    refreshVehicles();
  }, [refreshVehicles]);

  useEffect(() => {
    if (!customModelMode && formMode === 'add') {
      const defaultModel = BRAND_SUGGESTIONS[selectedBrand]?.[0] || '';
      setFormState((prev) => ({ ...prev, brand: selectedBrand, model: defaultModel }));
    } else {
      setFormState((prev) => ({ ...prev, brand: selectedBrand }));
    }
  }, [selectedBrand, customModelMode, formMode]);

  const totalVehicles = vehicles.length;
  const countStatus5 = vehicles.filter((v) => v.status === 5).length;
  const countStatus1 = vehicles.filter((v) => v.status === 1).length;
  const countStatus2 = vehicles.filter((v) => v.status === 2).length;
  const countStatus3 = vehicles.filter((v) => v.status === 3).length;
  const countStatus4 = vehicles.filter((v) => v.status === 4).length;

  const isDataHidden = filterMonth === 'none';

  const baseIntakeVehicles = isDataHidden
    ? []
    : vehicles.filter((v) => {
        if (!v.entryDate || v.entryDate === '0000-00-00') {
          return filterDay === 'all' && filterMonth === 'all' && filterYear === 'all';
        }
        const parts = v.entryDate.toString().split('-');
        const yearMatch = filterYear === 'all' || parts[0] === filterYear;
        const monthMatch = filterMonth === 'all' || parts[1] === filterMonth;
        const dayMatch = filterDay === 'all' || parts[2] === filterDay;
        return yearMatch && monthMatch && dayMatch;
      });

  const filteredIntakeVehicles = baseIntakeVehicles.filter((v) => dateStatusFilter === 'all' || v.status === parseInt(dateStatusFilter, 10));

  const getFinalAdminRecords = () => {
    const query = adminSearchQuery.trim().toLowerCase();
    if (!query) {
      let records = baseIntakeVehicles;
      if (adminStatusFilter !== 'all') {
        records = records.filter((v) => v.status === parseInt(adminStatusFilter, 10));
      }
      if (dateStatusFilter !== 'all') {
        records = records.filter((v) => v.status === parseInt(dateStatusFilter, 10));
      }
      return records;
    }

    const cleanPhoneQuery = query.replace(/[^0-9]/g, '');
    return vehicles.filter((v) => {
      if (adminStatusFilter !== 'all' && v.status !== parseInt(adminStatusFilter, 10)) return false;
      if (dateStatusFilter !== 'all' && v.status !== parseInt(dateStatusFilter, 10)) return false;
      const dbPhone = v.phone ? v.phone.replace(/[^0-9]/g, '') : '';
      const matchOwner = v.ownerName && v.ownerName.toLowerCase().includes(query);
      const matchPlate = v.plateNo && v.plateNo.toLowerCase().includes(query);
      const matchModel = v.model && v.model.toLowerCase().includes(query);
      const matchReceipt = v.receiptNo && v.receiptNo.toLowerCase().includes(query);
      const matchVin = v.vin && v.vin.toLowerCase().includes(query);
      const matchPhone = cleanPhoneQuery && dbPhone.includes(cleanPhoneQuery);
      return matchOwner || matchPlate || matchModel || matchReceipt || matchVin || matchPhone;
    });
  };

  const finalAdminRecords = getFinalAdminRecords();
  const totalPortfolioValue = baseIntakeVehicles.reduce((acc, curr) => acc + toVehicleCost(curr.cost), 0);

  const handleClientSearch = async (e) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSearchError('กรุณากรอกเบอร์โทรศัพท์, ชื่อลูกค้า หรือเลขใบสั่งซ่อม');
      setSearchResult(null);
      return;
    }

    let found = vehicles.find((v) => {
      const dbPhone = v.phone ? v.phone.replace(/[^0-9]/g, '') : '';
      const searchPhone = query.replace(/[^0-9]/g, '');
      return (
        (v.receiptNo && v.receiptNo.toLowerCase() === query) ||
        (v.ownerName && v.ownerName.toLowerCase().includes(query)) ||
        (searchPhone && dbPhone.includes(searchPhone))
      );
    });

    if (!found) {
      try {
        const response = await fetch(`${API_URL}?search=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('search failed');
        const results = await response.json();
        found = Array.isArray(results) ? results[0] : null;
      } catch (error) {
        console.error('[vehicles] search failed', error);
        setSearchResult(null);
        setSearchError('ระบบค้นหาข้อมูลยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง');
        return;
      }
    }

    if (found) {
      setSearchResult(found);
      setSearchError('');
      showToast('ดึงข้อมูลกิจกรรมความคืบหน้าเรียบร้อย!', 'success');
    } else {
      setSearchResult(null);
      setSearchError('ไม่พบข้อมูลประวัติที่สืบค้นในสารบบ คิวจอง หรือพ้นกำหนดระยะเวลาพิทักษ์ความลับบุคคล');
    }
  };

  const resetFormState = () => {
    setEditingVehicleId(null);
    setFormState({
      receiptNo: '',
      ownerName: '',
      phone: '',
      plateNo: '',
      brand: 'Mercedes-Benz',
      model: '',
      color: '',
      status: 1,
      statusText: '',
      entryDate: '2026-06-05',
      bookingTime: '',
      estimatedCompletion: '',
      mileage: '',
      cost: 0,
      vin: '',
      receiptName: null,
      receiptUrl: null,
      logs: []
    });
  };

  const handleFormSaveSubmit = async (e) => {
    e.preventDefault();
    if (!formState.ownerName || !formState.phone || !formState.entryDate) {
      showToast('กรุณากรอกข้อมูลจำเพาะฝั่งลูกค้าที่สำคัญให้ครบถ้วน', 'error');
      return;
    }
    const timeNow = new Date().toLocaleString('th-TH');
    let finalReceiptNo = formState.receiptNo.trim();
    if (!finalReceiptNo) {
      finalReceiptNo = `REC-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    const payload = {
      ...formState,
      receiptNo: finalReceiptNo,
      id: formMode === 'edit' && editingVehicleId ? editingVehicleId : `job-${Date.now()}`,
      status: parseInt(formState.status, 10),
      cost: toVehicleCost(formState.cost),
      vin: formState.vin ? formState.vin.toUpperCase().trim() : '',
      logs:
        formMode === 'edit'
          ? formState.logs || []
          : [
              {
                date: timeNow,
                text:
                  formState.status === 1
                    ? `บันทึกจองคิวนัดหมายทางโทรศัพท์ วันนัด: ${formatThaiDate(formState.entryDate)} เวลา: ${formState.bookingTime || 'ไม่ได้ระบุ'} น.`
                    : `ลงทะเบียนเปิดเคสงานซ่อมรหัส ${finalReceiptNo} เข้าอู่วันที่: ${formatThaiDate(formState.entryDate)}`
              }
            ]
    };

    const result = await saveVehicleToServer(payload);
    if (result) {
      showToast(`ทำรายการบันทึกข้อมูล ${finalReceiptNo} เรียบร้อยแล้ว`, 'success');
      await refreshVehicles();
    }

    setShowFormModal(false);
    resetFormState();
  };

  const triggerEditMode = (vehicle) => {
    setFormMode('edit');
    setEditingVehicleId(vehicle.id);
    setSelectedBrand(vehicle.brand);
    setFormState({
      receiptNo: vehicle.receiptNo || '',
      ownerName: vehicle.ownerName || '',
      phone: vehicle.phone || '',
      plateNo: vehicle.plateNo || '',
      brand: vehicle.brand || 'Mercedes-Benz',
      model: vehicle.model || '',
      color: vehicle.color || '',
      status: vehicle.status || 1,
      statusText: vehicle.statusText || '',
      entryDate: vehicle.entryDate || '2026-06-05',
      bookingTime: vehicle.bookingTime || '',
      estimatedCompletion: vehicle.estimatedCompletion || '',
      mileage: vehicle.mileage != null ? vehicle.mileage : '',
      cost: toVehicleCost(vehicle.cost),
      vin: vehicle.vin || '',
      receiptName: vehicle.receiptName,
      receiptUrl: vehicle.receiptUrl,
      logs: vehicle.logs || []
    });
    setCustomModelMode(!BRAND_SUGGESTIONS[vehicle.brand]?.includes(vehicle.model));
    setShowFormModal(true);
  };

  const triggerAddMode = (isQuickBooking = false) => {
    setFormMode('add');
    setSelectedBrand('Mercedes-Benz');
    const nextNum = 2606000 + vehicles.length + 1;
    setFormState({
      receiptNo: `REC-${nextNum}`,
      ownerName: '',
      phone: '',
      plateNo: '',
      brand: 'Mercedes-Benz',
      model: BRAND_SUGGESTIONS['Mercedes-Benz'][0],
      color: '',
      status: isQuickBooking ? 1 : 2,
      statusText: isQuickBooking ? 'จองคิวรับบริการล่วงหน้าในสารบบ' : 'ตรวจเช็คประเมินผลเบื้องต้น',
      entryDate: '2026-06-05',
      bookingTime: isQuickBooking ? '10:00' : '',
      estimatedCompletion: '',
      cost: 0,
      vin: '',
      receiptName: null,
      receiptUrl: null,
      logs: []
    });
    setCustomModelMode(false);
    setShowFormModal(true);
  };

  const handleReceiptUpload = (e, vehicleId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const currentVehicle = vehicles.find((v) => v.id === vehicleId);
      if (!currentVehicle) return;
      const updatedVehicle = {
        ...currentVehicle,
        receiptName: file.name,
        receiptUrl: reader.result,
        logs: [{ date: new Date().toLocaleString('th-TH'), text: `แอดมินอัปโหลดหลักฐานใบเสร็จ: ${file.name}` }, ...(currentVehicle.logs || [])]
      };
      const saved = await saveVehicleToServer(updatedVehicle);
      if (saved) {
        const savedVehicle = normalizeVehicleFromApi(saved.vehicle || updatedVehicle);
        setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? savedVehicle : v)));
        if (searchResult && searchResult.id === vehicleId) {
          setSearchResult(savedVehicle);
        }
        showToast('อัปโหลดไฟล์หลักฐานสำเร็จ!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteVehicle = (id, plateNo) => {
    setConfirmModal({
      show: true,
      message: `คุณแน่ใจหรือไม่ที่จะลบข้อมูลประวัติงานซ่อม ทะเบียน [${plateNo || 'ไม่มีป้ายทะเบียน'}] นี้ออกจากสารบบของ JBM Pro Auto?`,
      onConfirm: async () => {
        const success = await deleteVehicleFromServer(id);
        if (success) {
          setVehicles((prev) => prev.filter((v) => v.id !== id));
          if (searchResult && searchResult.id === id) {
            setSearchResult(null);
          }
          showToast('ลบประวัติงานซ่อมออกจากฐานข้อมูลสำเร็จ', 'success');
        }
        setConfirmModal({ show: false, message: '', onConfirm: null });
      }
    });
  };

  const updateVehicleStatus = async (id, newStatus, customText = '') => {
    const timeNow = new Date().toLocaleString('th-TH');
    const vehicle = vehicles.find((v) => v.id === id);
    if (!vehicle) return;

    let text = customText || vehicle.statusText;
    if (newStatus === 1 && !customText) text = 'ยืนยันจองสิทธิ์เข้ารับบริการ';
    if (newStatus === 2 && !customText) text = 'ตรวจเช็คสภาพรถยนต์เบื้องต้นโดยละเอียด';
    if (newStatus === 3 && !customText) text = 'รออะไหล่นำเข้าจากผู้จัดจำหน่ายหลัก';
    if (newStatus === 4 && !customText) text = 'กำลังดำเนินการแก้ไขและทดสอบระบบ';
    if (newStatus === 5 && !customText) text = 'เสร็จสมบูรณ์ ทำความสะอาดภายนอก-ภายใน พร้อมส่งมอบ';

    const updatedVehicle = {
      ...vehicle,
      status: normalizeStatusCode(newStatus),
      statusText: text,
      logs: [{ date: timeNow, text: `เปลี่ยนสถานะเป็น: ${newStatus === 1 ? 'จองคิว' : newStatus === 2 ? 'เช็ครถ' : newStatus === 3 ? 'รออะไหล่' : newStatus === 4 ? 'กำลังซ่อม' : 'เสร็จรอส่ง'} - ${text}` }, ...(vehicle.logs || [])]
    };

    const saved = await saveVehicleToServer(updatedVehicle);
    if (saved) {
      setVehicles((prev) => prev.map((v) => (v.id === id ? updatedVehicle : v)));
      showToast('อัปเดตสถานะรถยนต์และบันทึกประวัติสำเร็จ', 'success');
      if (searchResult && searchResult.id === id) {
        setSearchResult(updatedVehicle);
      }
    }
  };

  return (
    <div className="jbm-light-theme min-h-screen bg-white text-slate-900 font-sans selection:bg-amber-200 selection:text-slate-900 relative">
      {toast.show && (
        <div className="fixed top-24 right-4 z-50 animate-bounce duration-300">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl bg-slate-100/90 text-amber-600 border-amber-500/40 backdrop-blur-md">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            <span className="text-sm font-semibold text-slate-950">{toast.message}</span>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100/90 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-xl">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-950">ยืนยันการดำเนินการ</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setConfirmModal({ show: false, message: '', onConfirm: null })} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all">ยกเลิก</button>
              <button onClick={confirmModal.onConfirm} className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all">ยืนยันตกลง</button>
            </div>
          </div>
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-2xl w-full my-8 space-y-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <Sparkles className="text-amber-500 w-5 h-5" />
                {formMode === 'add' ? 'ลงทะเบียนเปิดบิลและจองคิวใหม่' : `แก้ไขปรับแต่งประวัติ ${formatReceiptDisplay(formState.receiptNo)}`}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-slate-500 hover:text-slate-900"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleFormSaveSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">เลขที่ใบแจ้งหนี้/ใบเสร็จ</label>
                <input type="text" value={formState.receiptNo} onChange={(e) => setFormState({ ...formState, receiptNo: e.target.value })} placeholder="ว่างไว้เพื่อสร้างอัตโนมัติ" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">ชื่อเจ้าของรถยนต์ *</label>
                <input type="text" required value={formState.ownerName} onChange={(e) => setFormState({ ...formState, ownerName: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                <input type="text" required value={formState.phone} onChange={(e) => setFormState({ ...formState, phone: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">หมายเลขป้ายทะเบียน</label>
                <input type="text" value={formState.plateNo || ''} onChange={(e) => setFormState({ ...formState, plateNo: e.target.value })} placeholder="ตัวอย่าง กข 1234" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">ยี่ห้อรถยนต์ *</label>
                <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:border-amber-500">
                  {CAR_BRANDS.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 flex justify-between items-center">
                  <span>รุ่นรถยนต์ *</span>
                  <button type="button" onClick={() => setCustomModelMode(!customModelMode)} className="text-[10px] text-amber-500 underline hover:text-amber-400">
                    {customModelMode ? 'เลือกจากตัวเลือกยอดนิยม' : 'พิมพ์ระบุเอง (Custom Model)'}
                  </button>
                </label>
                {customModelMode ? (
                  <input type="text" required value={formState.model || ''} onChange={(e) => setFormState({ ...formState, model: e.target.value })} placeholder="ระบุรุ่น เช่น Panamera GTS" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950" />
                ) : (
                  <select value={formState.model} onChange={(e) => setFormState({ ...formState, model: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none">
                    <option value="">-- เลือกรุ่นรถยนต์ --</option>
                    {(BRAND_SUGGESTIONS[selectedBrand] || []).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-slate-400 mb-1">สีรถ</label>
                <input type="text" value={formState.color || ''} onChange={(e) => setFormState({ ...formState, color: e.target.value })} placeholder="เช่น Polar White" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">ราคาค่าซ่อมซ่อมบำรุงประเมิน (บาท)</label>
                <input type="number" value={formState.cost || 0} onChange={(e) => setFormState({ ...formState, cost: parseInt(e.target.value, 10) || 0 })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">หมายเลขตัวถัง (Chassis VIN)</label>
                <input type="text" value={formState.vin || ''} onChange={(e) => setFormState({ ...formState, vin: e.target.value })} placeholder="พิมพ์ระบุหมายเลขตัวถัง" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 uppercase" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">เลขไมล์รถ (กม.)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formState.mileage != null ? formState.mileage : ''}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    const cleanedValue = rawValue === '' ? '' : parseInt(rawValue, 10);
                    setFormState({ ...formState, mileage: cleanedValue });
                  }}
                  placeholder="ระบุเลขไมล์รถ"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">ขั้นตอน / ระดับสเตตัส</label>
                <select value={formState.status} onChange={(e) => setFormState({ ...formState, status: parseInt(e.target.value, 10) })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950">
                  <option value="1">1. จองคิว</option>
                  <option value="2">2. เช็ครถ</option>
                  <option value="3">3. รออะไหล่</option>
                  <option value="4">4. กำลังซ่อม</option>
                  <option value="5">5. เสร็จรอส่ง</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">เวลาจองคิวนัดหมาย (น.)</label>
                <input
                  id="bookingTime"
                  type="time"
                  value={formState.bookingTime || ''}
                  onChange={(e) => setFormState({ ...formState, bookingTime: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">วันที่รับรถเข้า / วันที่นัดจอง *</label>
                <input
                  id="entryDate"
                  type="date"
                  required
                  value={formState.entryDate}
                  onChange={(e) => setFormState({ ...formState, entryDate: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">ประมาณการวันที่ซ่อมเสร็จ</label>
                <input
                  id="estimatedCompletion"
                  type="date"
                  value={formState.estimatedCompletion || ''}
                  onChange={(e) => setFormState({ ...formState, estimatedCompletion: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-slate-400 mb-1">รายละเอียดและอาการขัดข้องที่ระบุ</label>
                <textarea value={formState.statusText || ''} onChange={(e) => setFormState({ ...formState, statusText: e.target.value })} placeholder="เช่น ซ่อมแซมไฟโชว์เครื่องยนต์ ระบบปรับอากาศขัดข้อง" className="w-full h-16 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:border-amber-500" />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">ยกเลิก</button>
                <button type="submit" className="px-6 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all">บันทึกแบบฟอร์ม</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="w-11 h-11 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/10">
                <span className="text-slate-950 font-black text-lg">JBM</span>
              </div>
              <div className="flex flex-col justify-center gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-950">JBM Pro Auto</h1>
                    <p className="text-[10px] text-slate-950">บจก. เจ รอยัล มอเตอร์ จำกัด (สำนักงานใหญ่)</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setActiveTab('home'); setSearchResult(null); setSearchQuery(''); }} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === 'home' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'text-slate-600 hover:text-slate-950'}`}>หน้าแรก</button>
              <button onClick={() => { setActiveTab('track'); setSearchResult(null); setSearchQuery(''); }} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === 'track' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'text-slate-600 hover:text-slate-950'}`}>ลูกค้าสืบค้น</button>
              <button onClick={() => { if (isAdminLoggedIn) { setActiveTab('admin'); } else { setActiveTab('login'); } }} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${isAdminLoggedIn ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200' : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'}`}>
                <ShieldCheck className="w-4 h-4" />
                <span>{isAdminLoggedIn ? 'หลังบ้านแอดมิน' : 'พนักงานอู่'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow bg-white">
        {activeTab === 'home' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-8 md:p-12 shadow-xl text-center">
              <div className="absolute -right-24 -top-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
              <div className="relative z-10 max-w-2xl mx-auto space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-200"><Sparkles className="w-3.5 h-3.5" /> Premium European Car Specialist</span>
                <h2 className="text-3xl md:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight">
                  อู่ซ่อมรถยนต์ยุโรป<br />
                  มาตรฐานพรีเมียม
                </h2>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">ศูนย์บริการซ่อมบำรุงวิศวกรรมเต็มรูปแบบสำหรับ Porsche, Benz, BMW, Audi, Volvo และ MINI พร้อมระบบนัดหมายจองคิว และติดตามงานซ่อมอย่างโปร่งใส</p>
                <div className="pt-6 flex flex-wrap justify-center gap-3">
                  <button onClick={() => setActiveTab('track')} className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg flex items-center gap-2"><Search className="w-4 h-4" /> ตรวจสอบสเตตัสรถยนต์</button>
                  <button onClick={() => { if (isAdminLoggedIn) { setActiveTab('admin'); } else { setActiveTab('login'); } }} className="px-6 py-3 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> แอดมินจัดการหลังบ้าน</button>
                </div>
              </div>
            </div>
            <div className="space-y-4 text-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">แบรนด์ยานยนต์พรีเมียมที่เราเชี่ยวชาญ</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {CAR_BRANDS.map((b) => (
                  <div key={b.name} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-slate-300 transition-all">
                    <Image src={`https://thesvg.org/icons/${b.logoSlug}/default.svg`} alt={b.name} width={40} height={40} className="rounded-full bg-white p-1" />
                    <span className="text-[10px] font-semibold text-slate-700">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'track' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="max-w-2xl mx-auto space-y-6 text-center">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20"><Search className="w-6 h-6" /></div>
              <h2 className="text-2xl font-bold">สืบค้นความคืบหน้ารถยนต์</h2>
              <p className="text-xs text-slate-400">กรุณากรอก <span className="text-amber-400 font-semibold">เบอร์โทรศัพท์มือถือ, ชื่อลูกค้า หรือเลขใบรับเงินสั่งซ่อม (REC-xxxx)</span> ของท่านเพื่อตรวจดึงข้อมูล</p>
              <form onSubmit={handleClientSearch} className="flex gap-2 max-w-md mx-auto">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="กรอกเบอร์โทรศัพท์ / ชื่อลูกค้า / รหัสใบเสร็จ..." className="flex-grow px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500" />
                <button type="submit" className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all">ค้นหาข้อมูล</button>
              </form>
              {searchError && <p className="text-xs text-red-400 font-medium">{searchError}</p>}
            </div>
            {searchResult && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl max-w-4xl mx-auto relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-slate-200 pb-5">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-600 border border-amber-200">{searchResult.brand}</span>
                    <h3 className="text-lg font-bold text-slate-950">{searchResult.model}</h3>
                    <p className="text-xs text-slate-600">ชื่อผู้จอง/ลูกค้า: <strong className="text-slate-950">{searchResult.ownerName}</strong> | โทรศัพท์: <strong className="text-slate-950">{searchResult.phone}</strong></p>
                    <p className="text-xs text-slate-600">เลขไมล์: <strong className="text-slate-950">{searchResult.mileage != null ? `${searchResult.mileage} กม.` : 'ไม่ได้ระบุ'}</strong></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">รหัสคดีซ่อมบำรุง</p>
                    <strong className="text-sm font-mono text-amber-500">{formatReceiptDisplay(searchResult.receiptNo)}</strong>
                  </div>
                </div>
                <div className="py-4 relative">
                  <div className="absolute top-[24px] left-[10%] right-[10%] h-[2px] bg-slate-200 -z-0">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-500" style={{ width: `${searchResult.status === 1 ? '0%' : searchResult.status === 2 ? '25%' : searchResult.status === 3 ? '50%' : searchResult.status === 4 ? '75%' : '100%'}` }} />
                  </div>
                  <div className="flex justify-between">
                    {[{ val: 1, stepNo: 1, name: 'จองคิว' }, { val: 2, stepNo: 2, name: 'เช็ครถ' }, { val: 3, stepNo: 3, name: 'รออะไหล่' }, { val: 4, stepNo: 4, name: 'กำลังซ่อม' }, { val: 5, stepNo: 5, name: 'เสร็จรอส่ง' }].map((stObj) => {
                      const isCurrent = searchResult.status === stObj.val;
                      const isDone = searchResult.status >= stObj.val;
                      return (
                        <div key={stObj.val} className="flex flex-col items-center flex-1 relative z-10">
                          <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-xs transition-all ${isCurrent ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold scale-110 shadow-lg' : isDone ? 'bg-amber-50 text-amber-600 border-amber-300' : 'bg-white border-slate-200 text-slate-500'}`}>
                            {stObj.stepNo}
                          </div>
                          <span className={`text-[10px] mt-2 font-semibold ${isCurrent ? 'text-amber-400' : 'text-slate-400'}`}>{stObj.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Settings className="w-4 h-4 text-amber-500" /> ข้อมูลและรายงานความคืบหน้างาน</h4>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2.5">
                      <p className="text-slate-600"><strong className="text-slate-950">ทะเบียนรถ:</strong> {searchResult.plateNo || 'ไม่ได้ระบุ'}</p>
                      <p className="text-slate-600"><strong className="text-slate-950">หมายเลขตัวถัง (VIN):</strong> <span className="font-mono">{searchResult.vin || 'ไม่ได้ระบุ'}</span></p>
                      <p className="text-slate-600"><strong className="text-slate-950">สีตัวรถ:</strong> {searchResult.color || 'ไม่ได้ระบุ'}</p>
                      <p className="text-slate-600"><strong className="text-slate-950">{searchResult.status === 1 ? 'วันนัดจองคิว:' : 'วันที่เข้าซ่อม:'}</strong> {formatThaiDate(searchResult.entryDate)} {searchResult.bookingTime && `(เวลา ${searchResult.bookingTime} น.)`}</p>
                      <p className="text-slate-600"><strong className="text-slate-950">ประมาณการวันที่ซ่อมเสร็จ:</strong> {formatThaiDate(searchResult.estimatedCompletion)}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                      <span className="text-[10px] text-slate-500 block">รายงานทางเทคนิค ณ ปัจจุบัน</span>
                      <p className="text-slate-700 mt-1 font-semibold leading-relaxed">{searchResult.statusText || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-amber-500" /> สรุปประเมินบัญชี</h4>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-500 block">งบประมาณการซ่อมแซม</span>
                        <h5 className="text-2xl font-black text-amber-500 mt-0.5">฿{searchResult.cost ? searchResult.cost.toLocaleString() : '0'}</h5>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded border border-amber-500/20">{searchResult.receiptUrl ? 'มีสลิปแนบในระบบ' : 'รอแอดมินอัปเดตใบสลิป'}</span>
                    </div>
                    {searchResult.receiptUrl ? (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <a href={searchResult.receiptUrl} target="_blank" rel="noreferrer" className="w-full py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all">
                          <FileText className="w-4 h-4 text-emerald-400" /> เปิดไฟล์หลักฐานใบเสร็จ / ใบเสนอราคาจำลอง
                        </a>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-xs text-slate-600 flex flex-col items-center justify-center gap-1">
                        <Lock className="w-5 h-5 text-slate-400 mb-1" />
                        <span>สิทธิ์การแก้ไขและอัปโหลดใบเสร็จเป็นของ "แอดมินหลังบ้านเท่านั้น"</span>
                      </div>
                    )}
                  </div>
                </div>
                {searchResult.logs && searchResult.logs.length > 0 && (
                  <div className="border-t border-slate-200 pt-5 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-500" /> ประวัติการทำงานและไทม์ไลน์ย้อนหลัง (Logs)</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {searchResult.logs.map((log, lIdx) => (
                        <div key={lIdx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-start text-xs">
                          <p className="text-slate-700">{log.text}</p>
                          <span className="text-[10px] text-slate-500 shrink-0 ml-4 font-mono">{log.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'login' && (
          <div className="my-10 flex justify-center animate-fadeIn">
            <div className="w-full max-w-[442px] bg-white border border-slate-200 rounded-[22px] px-6 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] space-y-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-200"><Lock className="w-5 h-5" /></div>
                <h2 className="text-lg font-bold text-slate-950 font-sans">เข้าสู่ระบบพนักงานอู่ JBM</h2>
                <p className="text-[12px] leading-relaxed text-slate-600 max-w-[360px] mx-auto">เพื่อความปลอดภัย โปรดเข้าสู่ระบบจากหน้าล็อกอินหลักของระบบหรือขอรหัสจากผู้ดูแล</p>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="admin-token" className="block text-[11px] font-semibold text-slate-600">รหัสพนักงาน</label>
                  <input
                    id="admin-token"
                    type="password"
                    value={adminTokenInput}
                    onChange={(e) => {
                      setAdminTokenInput(e.target.value);
                      setAdminLoginError('');
                    }}
                    autoComplete="current-password"
                    className="block w-full h-[52px] px-4 py-3 bg-white border border-slate-300 rounded-[12px] text-[15px] font-semibold text-slate-950 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                    placeholder="กรอกรหัสจากผู้ดูแลระบบ"
                  />
                </div>
                {adminLoginError && (
                  <p className="text-[12px] text-red-500 bg-red-50 border border-red-200 rounded-[12px] px-3 py-2.5">{adminLoginError}</p>
                )}
                <button type="submit" disabled={isLoading} className="w-full h-[51px] bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:opacity-60 text-slate-950 font-bold rounded-[10px] transition-all">
                  {isLoading ? 'กรุณารอสักครู่...' : 'เข้าสู่ระบบพนักงาน'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'admin' && isAdminLoggedIn && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20"><UserCog className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-base font-bold text-slate-950">แผงสารสนเทศและควบคุมยอดรายรับ (JBM Executive Portal)</h2>
                  <p className="text-xs text-slate-400">ควบคุมระดับซ่อมแซม จองคิว และสรุปอัตราการเติบโตของอู่ พัฒนาการ 30</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => triggerAddMode(true)} className="px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all shadow-md"><Plus className="w-4 h-4" /> บันทึกจองคิวใหม่</button>
                <button onClick={() => triggerAddMode(false)} className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 hover:from-amber-600 hover:to-yellow-700 transition-all shadow-md"><Plus className="w-4 h-4" /> ลงทะเบียนเคสซ่อมใหม่</button>
                <button onClick={handleAdminLogout} className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all">ออกจากระบบ</button>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3 justify-between">
                <div className="flex items-center gap-2"><TrendingUp className="text-emerald-500 w-5 h-5" /><h3 className="text-sm font-bold text-slate-950">สรุปรายได้จาก vehicles.cost แยกรายเดือนและรายปี พ.ศ.</h3></div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20">ยอดรวมตามตัวกรอง ฿{totalPortfolioValue.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {REPORT_YEARS.slice(0, 3).map((yearValue) => {
                  const yearKey = String(yearValue);
                  const yearTotal = vehicles.filter((v) => v.entryDate?.startsWith(yearKey)).reduce((sum, curr) => sum + toVehicleCost(curr.cost), 0);
                  const thaiYearBE = parseInt(yearKey, 10) + 543;
                  return (
                    <div key={yearKey} className="bg-white p-4 rounded-xl border border-slate-200/80 relative overflow-hidden">
                      <div className="absolute right-3 top-3 text-slate-400 font-black text-4xl select-none">{thaiYearBE}</div>
                      <div className="relative z-10 space-y-2">
                        <span className="text-[10px] text-slate-500 block">รายได้รวม พ.ศ. {thaiYearBE}</span>
                        <h4 className="text-xl font-extrabold text-emerald-500">฿{yearTotal.toLocaleString()}.00</h4>
                        <p className="text-[9px] text-slate-500">จำนวนรถที่เข้าอู่รับการประเมิน: {vehicles.filter((v) => v.entryDate?.startsWith(yearKey)).length} คัน</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 overflow-x-auto">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-3 font-sans">เปรียบเทียบยอดรวมสะสมรายได้ แต่ละปีปฏิทิน พ.ศ. (พ.ศ. 2568 - 2579)</span>
                <table className="w-full text-left text-[10px] border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-2">เดือน พ.ศ.</th>
                      {REPORT_YEARS.map((yearValue) => (
                        <th key={yearValue} className="pb-2 text-right">ปี {parseInt(yearValue, 10) + 543}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {MONTHS_TH.map((monthName, mIdx) => (
                      <tr key={monthName} className="hover:bg-slate-50">
                        <td className="py-2 text-slate-600 font-medium">{monthName}</td>
                        {REPORT_YEARS.map((yearValue) => {
                          const yearText = String(yearValue);
                          const monthText = String(mIdx + 1).padStart(2, '0');
                          const total = vehicles
                            .filter((v) => v.entryDate?.startsWith(yearText))
                            .filter((v) => v.entryDate?.split('-')[1] === monthText)
                            .reduce((sum, curr) => sum + toVehicleCost(curr.cost), 0);
                          return (
                            <td key={`${yearValue}-${mIdx}`} className={`py-2 text-right font-mono ${total > 0 ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>
                              {total > 0 ? `฿${total.toLocaleString()}` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[
                { val: 'all', lbl: 'ทั้งหมด', num: totalVehicles, col: 'text-slate-950', icon: <Car className="w-4 h-4" /> },
                { val: 1, lbl: '1. จองคิว', num: countStatus1, col: 'text-fuchsia-400', icon: <Clock className="w-4 h-4" /> },
                { val: 2, lbl: '2. เช็ครถ', num: countStatus2, col: 'text-sky-400', icon: <Wrench className="w-4 h-4" /> },
                { val: 3, lbl: '3. รออะไหล่', num: countStatus3, col: 'text-orange-400', icon: <FileText className="w-4 h-4" /> },
                { val: 4, lbl: '4. กำลังซ่อม', num: countStatus4, col: 'text-indigo-400', icon: <Settings className="w-4 h-4" /> },
                { val: 5, lbl: '5. เสร็จรอส่ง', num: countStatus5, col: 'text-emerald-400', icon: <CheckCircle2 className="w-4 h-4" /> }
              ].map((card) => {
                const isSelected = adminStatusFilter === card.val.toString() || (card.val === 'all' && adminStatusFilter === 'all');
                return (
                  <button key={card.val} onClick={() => { setAdminStatusFilter(card.val.toString()); setDateStatusFilter('all'); }} className={`text-left p-4 rounded-xl transition-all border active:scale-95 ${isSelected ? 'bg-amber-50 border-amber-500 shadow-lg shadow-amber-200/50' : 'bg-white/90 border-slate-200 hover:bg-slate-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] text-slate-500 font-semibold">{card.lbl}</span>
                      <span className={`p-1 rounded bg-slate-100 ${card.col}`}>{card.icon}</span>
                    </div>
                    <h3 className={`text-2xl font-bold ${card.col}`}>{card.num}</h3>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xl">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-950">ปฏิทินงานอู่ล่วงหน้า 10 ปี (Extended Full Date Selector)</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">ระบุ วัน</label>
                    <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)} className="block w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-950 focus:outline-none">
                      <option value="all">ทั้งหมด</option>
                      {Array.from({ length: 31 }, (_, i) => {
                        const val = String(i + 1).padStart(2, '0');
                        return <option key={val} value={val}>{val}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">ระบุ เดือน</label>
                    <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="block w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-950 focus:outline-none">
                      <option value="all">ทั้งหมด</option>
                      {MONTHS_TH.map((m, idx) => {
                        const val = String(idx + 1).padStart(2, '0');
                        return <option key={val} value={val}>{m}</option>;
                      })}
                      <option value="none">🔒 ปิดแสดงผลข้อมูลลับ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">ปี พ.ศ. (ล่วงหน้า)</label>
                    <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="block w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-950 focus:outline-none">
                      <option value="all">ทั้งหมด</option>
                      {Array.from({ length: 12 }, (_, i) => {
                        const yearNum = 2025 + i;
                        return <option key={yearNum} value={String(yearNum)}>{`${yearNum + 543} (${yearNum})`}</option>;
                      })}
                    </select>
                  </div>
                </div>
                {isDataHidden ? (
                  <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl text-center space-y-3">
                    <EyeOff className="w-8 h-8 text-rose-500 mx-auto" />
                    <h4 className="text-xs font-semibold text-rose-400">ระบบปกปิดความลับพนักงานทำงานอยู่</h4>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-500">รถที่นัดจองหรือเข้าซ่อมในปฏิทินที่เลือก:</span>
                      <p className="font-bold text-amber-500 mt-0.5">
                        {filterDay !== 'all' ? `วันที่ ${filterDay} ` : ''}
                        {filterMonth !== 'all' ? `เดือน ${MONTHS_TH[parseInt(filterMonth, 10) - 1]} ` : ''}
                        {filterYear !== 'all' ? `พ.ศ. ${parseInt(filterYear, 10) + 543}` : 'ทุกช่วงเวลา'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      {[5, 1, 2, 3, 4].map((statusCode) => {
                        const count = baseIntakeVehicles.filter((v) => v.status === statusCode).length;
                        const isSubSelected = dateStatusFilter === String(statusCode);
                        return (
                          <button key={statusCode} onClick={() => { setDateStatusFilter(isSubSelected ? 'all' : String(statusCode)); setAdminStatusFilter('all'); }} className={`p-2 rounded-lg border text-left flex justify-between items-center transition-all ${isSubSelected ? 'bg-slate-200 border-amber-500' : 'bg-white border-slate-200/80 hover:bg-slate-50'}`}>
                            <span className="text-slate-400">{STATUS_DETAILS[statusCode].name}</span>
                            <strong className={STATUS_DETAILS[statusCode].color.split(' ')[0]}>{count} คัน</strong>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-bold text-slate-950">สัดส่วนยี่ห้อรถยนต์สะสม (Brand Volume Metric)</h3>
                  <span className="text-[10px] text-slate-500">ประมวลผลทันที</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-4">
                  {CAR_BRANDS.map((brand) => {
                    const count = vehicles.filter((v) => v.brand === brand.name).length;
                    return (
                      <div key={brand.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-500 block">{brand.name}</span>
                        <strong className="text-sm text-slate-950 font-bold">{count} คันสะสม</strong>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-600">⚠️ แอดมินสามารถคลิกที่กลุ่มสถานะย่อยข้างต้นของแผงปฏิทินเพื่อคัดกรองตารางข้อมูลรถยนต์ด้านล่างตามวันเวลาดังกล่าว</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-950">รายการรับซ่อมและคิวจองในระบบสารสนเทศ</h3>
                  {adminSearchQuery.trim() && (
                    <p className="text-[10px] text-amber-500 font-semibold flex items-center gap-1"><Info className="w-3.5 h-3.5" /> โหมดค้นหากลางใช้งานอยู่: กำลังกรองค้นหาจากรถยนต์ทั้งหมดในระบบโดยละเว้นปฏิทินชั่วคราว</p>
                  )}
                </div>
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input type="text" value={adminSearchQuery} onChange={(e) => setAdminSearchQuery(e.target.value)} placeholder="สืบค้นชื่อ / ทะเบียน / โทรศัพท์ / เลขตัวถัง..." className="block w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500" />
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase bg-slate-100">
                      <th className="p-4">รายการรหัส / ยานพาหนะ</th>
                      <th className="p-4">ผู้ติดต่อฝั่งลูกค้า</th>
                      <th className="p-4">วันเวลารับรถ / คิวจอง</th>
                      <th className="p-4 text-right">งบประมาณ / เลขตัวถัง (VIN)</th>
                      <th className="p-4">สถานะล่าสุด</th>
                      <th className="p-4 text-right">จัดการระบบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {finalAdminRecords.map((v) => {
                      const statusDetail = getStatusDetail(v.status);
                      const vehicleCost = toVehicleCost(v.cost);
                      return (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 space-y-1">
                          <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 border border-slate-200">{v.brand}</span><strong className="text-slate-950">{formatReceiptDisplay(v.receiptNo)}</strong></div>
                          <p className="text-slate-950 font-bold">{v.model}</p>
                          <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 font-mono">
                            <span>ทะเบียน: {v.plateNo || 'ไม่ได้ระบุ'}</span>
                            <span>ไมล์: {v.mileage != null ? `${v.mileage} กม.` : 'ไม่ได้ระบุ'}</span>
                          </div>
                        </td>
                        <td className="p-4 space-y-0.5"><p className="text-slate-950 font-semibold">{v.ownerName}</p><span className="text-[10px] text-slate-500 block">{v.phone}</span></td>
                        <td className="p-4 space-y-0.5"><p className="text-slate-700">{v.status === 1 ? 'วันนัดจองคิว:' : 'วันที่รับซ่อม:'} {formatThaiDate(v.entryDate)}</p>{v.bookingTime && (<p className="text-[10px] text-fuchsia-500 flex items-center gap-1 font-semibold"><Clock className="w-3.5 h-3.5" /> เวลา: {v.bookingTime} น.</p>)}</td>
                        <td className="p-4 text-right space-y-1"><p className="font-bold text-amber-500">฿{vehicleCost.toLocaleString()}</p><span className="text-[9px] text-slate-500 font-mono block">VIN: {v.vin || 'ไม่ระบุ'}</span></td>
                        <td className="p-4 space-y-1.5"><div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${v.status === 5 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} /><span className={`text-[10px] font-bold ${statusDetail.color.split(' ')[0]}`}>{statusDetail.name}</span></div><div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((sVal) => (<button key={sVal} onClick={() => updateVehicleStatus(v.id, sVal)} className={`w-5 h-5 rounded border text-[9px] flex items-center justify-center transition-all ${v.status === sVal ? 'bg-amber-500/10 border-amber-500 text-amber-600 font-bold' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>{sVal}</button>))}</div></td>
                        <td className="p-4"><div className="flex items-center justify-end gap-1.5"><button onClick={() => triggerEditMode(v)} className="p-1.5 bg-slate-100 border border-slate-200 rounded-lg text-amber-600 hover:bg-slate-200" title="แก้ไขประวัติอย่างละเอียด"><Edit2 className="w-3.5 h-3.5" /></button><div className="relative"><input type="file" accept="image/*" id={`file-${v.id}`} onChange={(e) => handleReceiptUpload(e, v.id)} className="hidden" /><label htmlFor={`file-${v.id}`} className={`p-1.5 rounded-lg border flex items-center justify-center cursor-pointer ${v.receiptUrl ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`} title="อัปโหลดภาพใบแจ้งหนี้"><Upload className="w-3.5 h-3.5" /></label></div><button onClick={() => handleDeleteVehicle(v.id, v.plateNo)} className="p-1.5 bg-slate-100 border border-slate-200 text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                      </tr>
                      );
                    })}
                    {finalAdminRecords.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-500"><AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" /><span>ไม่พบผลการค้นหาข้อมูลในระบบคดีซ่อม JBM</span></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {activeTab !== 'admin' && (
        <footer className="mt-auto border-t border-slate-200 bg-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center border border-amber-500/20 font-bold">J</div>
              <div>
                <h4 className="text-sm font-semibold text-slate-950">บริษัท เจ รอยัล มอเตอร์ จำกัด</h4>
                <p className="text-[10px] text-slate-500 font-semibold">สำนักงานใหญ่ (ถ.พัฒนาการ 30)</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">อู่ซ่อมบำรุงรักษาซ่อมแซมยานยนต์ยุโรปแบรนด์พรีเมียม Mercedes-Benz, BMW, Audi, Volvo, Porsche, MINI ครบวงจรด้วยเครื่องมือวิเคราะห์รหัสแท้เฉพาะรุ่น</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">ข้อมูลการติดต่อและที่อยู่</h4>
            <div className="text-xs text-slate-400 space-y-2">
              <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-amber-500 shrink-0" /><span>เลขที่ 616/1 ซอยพัฒนาการ 30 แขวงสวนหลวง เขตสวนหลวง กรุงเทพมหานคร 10250</span></p>
              <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-amber-500 shrink-0" /><span>099 265 1133</span></p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="https://www.facebook.com/jbmproauto?locale=th_TH" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 bg-slate-100 text-[11px] text-slate-950 hover:bg-slate-200 transition">
                <Image src={SOCIAL_LOGOS.facebook} alt="Facebook" width={18} height={18} />
                <span>Facebook / jbmproauto</span>
              </a>
              <a href="https://www.instagram.com/jbm.pro.auto" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 bg-slate-100 text-[11px] text-slate-950 hover:bg-slate-200 transition">
                <Image src={SOCIAL_LOGOS.instagram} alt="Instagram" width={18} height={18} />
                <span>Instagram / jbm.pro.auto</span>
              </a>
              <a href="https://line.me/R/ti/p/%40JBMPRO" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 bg-slate-100 text-[11px] text-slate-950 hover:bg-slate-200 transition">
                <Image src={SOCIAL_LOGOS.line} alt="LINE" width={18} height={18} />
                <span>@JBMPRO</span>
              </a>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-950 uppercase tracking-wider font-bold">ผู้รับผิดชอบบริษัท</h4>
            <div className="lg:flex lg:items-start lg:gap-4">
              <div className="text-xs text-slate-400 space-y-1.5 lg:flex-1">
                <p className="font-semibold text-slate-700">นายมานิต จาวาลา</p>
                <p className="font-semibold text-slate-700">นายธนกฤต กิตติธรโภคิน</p>
              </div>
              <div className="mt-4 lg:mt-0 lg:w-40">
                <div className="overflow-hidden rounded-3xl border border-slate-200">
                  <iframe
                    title="JBM Pro Auto map"
                    className="w-full h-40"
                    src="https://www.google.com/maps?q=616%2F1+Soi+Phatthanakan+30+Bangkok+10250&output=embed"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-slate-200 text-slate-600 text-[10px] text-center">&copy; 2026 JBM Pro Auto. สงวนลิขสิทธิ์ทั้งหมดโดย บริษัท เจ รอยัล มอเตอร์ จำกัด (สำนักงานใหญ่)</div>
      </footer>
      )}
    </div>
  );
}
