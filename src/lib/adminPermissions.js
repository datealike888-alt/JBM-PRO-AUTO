import bcrypt from 'bcryptjs';
import { query } from './db';
import { getAuthorizedAdminFromRequest } from './adminAuth';

// ---------------------------------------------------------------------------
// Permission Keys
// ---------------------------------------------------------------------------

export const PERMISSION_KEYS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_REPAIR: 'dashboard.repair',
  DASHBOARD_STOCK: 'dashboard.stock',
  DASHBOARD_FINANCE: 'dashboard.finance',
  DASHBOARD_EMPLOYEE: 'dashboard.employee',
  DASHBOARD_ALL: 'dashboard.all',

  // Repair
  REPAIR_VIEW: 'repair.view',
  REPAIR_CREATE: 'repair.create',
  REPAIR_UPDATE: 'repair.update',
  REPAIR_DELETE: 'repair.delete',

  // Calendar
  CALENDAR_VIEW: 'calendar.view',

  // Vehicles
  VEHICLES_VIEW: 'vehicles.view',
  VEHICLES_CREATE: 'vehicles.create',
  VEHICLES_UPDATE: 'vehicles.update',
  VEHICLES_DELETE: 'vehicles.delete',

  // Stock
  STOCK_VIEW: 'stock.view',
  STOCK_CREATE: 'stock.create',
  STOCK_UPDATE: 'stock.update',
  STOCK_DELETE: 'stock.delete',
  STOCK_MOVEMENT: 'stock.movement',

  // Finance
  FINANCE_VIEW: 'finance.view',
  FINANCE_CREATE: 'finance.create',
  FINANCE_UPDATE: 'finance.update',
  FINANCE_DELETE: 'finance.delete',
  FINANCE_EXPORT: 'finance.export',

  // Cash Reserve
  CASH_RESERVE_VIEW: 'cashReserve.view',
  CASH_RESERVE_CREATE: 'cashReserve.create',
  CASH_RESERVE_UPDATE: 'cashReserve.update',
  CASH_RESERVE_DELETE: 'cashReserve.delete',

  // Payment Debts
  PAYMENT_DEBTS_VIEW: 'paymentDebts.view',
  PAYMENT_DEBTS_CREATE: 'paymentDebts.create',
  PAYMENT_DEBTS_UPDATE: 'paymentDebts.update',
  PAYMENT_DEBTS_DELETE: 'paymentDebts.delete',
  PAYMENT_DEBTS_PAYMENT: 'paymentDebts.payment',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_FINANCE: 'reports.finance',

  // Employees
  EMPLOYEES_VIEW: 'employees.view',
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_UPDATE: 'employees.update',
  EMPLOYEES_DELETE: 'employees.delete',
  EMPLOYEES_ATTENDANCE: 'employees.attendance',
  EMPLOYEES_LEAVE: 'employees.leave',
  ATTENDANCE_VIEW: 'attendance.view',
  LEAVE_VIEW: 'leave.view',

  // Roles
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',

  // Admin Users
  ADMIN_USERS_VIEW: 'adminUsers.view',
  ADMIN_USERS_CREATE: 'adminUsers.create',
  ADMIN_USERS_UPDATE: 'adminUsers.update',
  ADMIN_USERS_DELETE: 'adminUsers.delete',
  ADMIN_USERS_PASSWORD: 'adminUsers.password',
  ADMIN_USERS_ROLE: 'adminUsers.role',
};

// ---------------------------------------------------------------------------
// All Permission Definitions (for seeding)
// ---------------------------------------------------------------------------

const ALL_PERMISSIONS = [
  { key: 'dashboard.view', name: 'ดู Dashboard', group: 'Dashboard' },
  { key: 'dashboard.repair', name: 'Dashboard งานซ่อม', group: 'Dashboard' },
  { key: 'dashboard.stock', name: 'Dashboard สต็อก', group: 'Dashboard' },
  { key: 'dashboard.finance', name: 'Dashboard การเงิน', group: 'Dashboard' },
  { key: 'dashboard.employee', name: 'Dashboard พนักงาน', group: 'Dashboard' },
  { key: 'dashboard.all', name: 'Dashboard ทั้งหมด', group: 'Dashboard' },

  { key: 'repair.view', name: 'ดูงานซ่อม', group: 'งานซ่อม' },
  { key: 'repair.create', name: 'สร้างงานซ่อม', group: 'งานซ่อม' },
  { key: 'repair.update', name: 'แก้ไขงานซ่อม', group: 'งานซ่อม' },
  { key: 'repair.delete', name: 'ลบงานซ่อม', group: 'งานซ่อม' },

  { key: 'calendar.view', name: 'ดูปฏิทินจองคิว', group: 'งานซ่อม' },

  { key: 'vehicles.view', name: 'ดูรถทั้งหมด', group: 'รถ' },
  { key: 'vehicles.create', name: 'เพิ่มรถ', group: 'รถ' },
  { key: 'vehicles.update', name: 'แก้ไขรถ', group: 'รถ' },
  { key: 'vehicles.delete', name: 'ลบรถ', group: 'รถ' },

  { key: 'stock.view', name: 'ดูสต๊อก', group: 'สต๊อกสินค้า' },
  { key: 'stock.create', name: 'เพิ่มสินค้า', group: 'สต๊อกสินค้า' },
  { key: 'stock.update', name: 'แก้ไขสินค้า', group: 'สต๊อกสินค้า' },
  { key: 'stock.delete', name: 'ลบสินค้า', group: 'สต๊อกสินค้า' },
  { key: 'stock.movement', name: 'เคลื่อนย้ายสต๊อก', group: 'สต๊อกสินค้า' },

  { key: 'finance.view', name: 'ดูการเงิน', group: 'การเงิน' },
  { key: 'finance.create', name: 'เพิ่มรายการเงิน', group: 'การเงิน' },
  { key: 'finance.update', name: 'แก้ไขรายการเงิน', group: 'การเงิน' },
  { key: 'finance.delete', name: 'ลบรายการเงิน', group: 'การเงิน' },
  { key: 'finance.export', name: 'ส่งออกข้อมูลเงิน', group: 'การเงิน' },

  { key: 'cashReserve.view', name: 'ดูเงินสำรองจ่าย', group: 'เงินสำรองจ่าย' },
  { key: 'cashReserve.create', name: 'เพิ่มเงินสำรองจ่าย', group: 'เงินสำรองจ่าย' },
  { key: 'cashReserve.update', name: 'แก้ไขเงินสำรองจ่าย', group: 'เงินสำรองจ่าย' },
  { key: 'cashReserve.delete', name: 'ลบเงินสำรองจ่าย', group: 'เงินสำรองจ่าย' },

  { key: 'paymentDebts.view', name: 'ดูค้างชำระ', group: 'ค้างชำระ' },
  { key: 'paymentDebts.create', name: 'เพิ่มค้างชำระ', group: 'ค้างชำระ' },
  { key: 'paymentDebts.update', name: 'แก้ไขค้างชำระ', group: 'ค้างชำระ' },
  { key: 'paymentDebts.delete', name: 'ลบค้างชำระ', group: 'ค้างชำระ' },
  { key: 'paymentDebts.payment', name: 'ชำระหนี้', group: 'ค้างชำระ' },

  { key: 'reports.view', name: 'ดูรายงาน', group: 'รายงาน' },
  { key: 'reports.finance', name: 'รายงานการเงิน', group: 'รายงาน' },

  { key: 'employees.view', name: 'ดูพนักงาน', group: 'พนักงาน' },
  { key: 'employees.create', name: 'เพิ่มพนักงาน', group: 'พนักงาน' },
  { key: 'employees.update', name: 'แก้ไขพนักงาน', group: 'พนักงาน' },
  { key: 'employees.delete', name: 'ลบพนักงาน', group: 'พนักงาน' },
  { key: 'employees.attendance', name: 'ลงเวลาพนักงาน', group: 'พนักงาน' },
  { key: 'employees.leave', name: 'จัดการใบลา', group: 'พนักงาน' },
  { key: 'attendance.view', name: 'ดูข้อมูลลงเวลา', group: 'พนักงาน' },
  { key: 'leave.view', name: 'ดูข้อมูลใบลา', group: 'พนักงาน' },

  { key: 'roles.view', name: 'ดูยศ', group: 'จัดการยศ' },
  { key: 'roles.create', name: 'สร้างยศ', group: 'จัดการยศ' },
  { key: 'roles.update', name: 'แก้ไขยศ', group: 'จัดการยศ' },
  { key: 'roles.delete', name: 'ลบยศ', group: 'จัดการยศ' },

  { key: 'adminUsers.view', name: 'ดูบัญชีผู้ใช้', group: 'จัดการผู้ใช้' },
  { key: 'adminUsers.create', name: 'สร้างบัญชีผู้ใช้', group: 'จัดการผู้ใช้' },
  { key: 'adminUsers.update', name: 'แก้ไขบัญชีผู้ใช้', group: 'จัดการผู้ใช้' },
  { key: 'adminUsers.delete', name: 'ลบบัญชีผู้ใช้', group: 'จัดการผู้ใช้' },
  { key: 'adminUsers.password', name: 'เปลี่ยนรหัสผ่าน', group: 'จัดการผู้ใช้' },
  { key: 'adminUsers.role', name: 'เปลี่ยนยศผู้ใช้', group: 'จัดการผู้ใช้' },
];

// ---------------------------------------------------------------------------
// Role Definitions
// ---------------------------------------------------------------------------

export const ROLE_DEFINITIONS = [
  {
    key: 'dashboard',
    name: 'แดชบอร์ด',
    description: 'เห็นหน้า Dashboard และภาพรวมตามข้อมูลที่ได้รับอนุญาต',
    permissions: [
      'dashboard.view',
      'dashboard.repair',
      'dashboard.stock',
      'dashboard.finance',
      'dashboard.employee',
    ],
  },
  {
    key: 'repair',
    name: 'งานซ่อม',
    description: 'เห็นเฉพาะงานซ่อม รถ คิว ปฏิทิน รถค้าง รถทั้งหมด',
    permissions: [
      'dashboard.view', 'dashboard.repair',
      'repair.view', 'repair.create', 'repair.update', 'repair.delete',
      'calendar.view',
      'vehicles.view', 'vehicles.create', 'vehicles.update', 'vehicles.delete',
    ],
  },
  {
    key: 'stock',
    name: 'สต๊อกสินค้า',
    description: 'เห็นเฉพาะสต๊อกสินค้า',
    permissions: [
      'dashboard.view', 'dashboard.stock',
      'stock.view', 'stock.create', 'stock.update', 'stock.delete', 'stock.movement',
    ],
  },
  {
    key: 'finance',
    name: 'การเงิน',
    description: 'เห็นการเงิน เงินสำรองจ่าย ค้างชำระ รายงาน/กราฟ',
    permissions: [
      'dashboard.view', 'dashboard.finance',
      'finance.view', 'finance.create', 'finance.update', 'finance.delete', 'finance.export',
      'cashReserve.view', 'cashReserve.create', 'cashReserve.update', 'cashReserve.delete',
      'paymentDebts.view', 'paymentDebts.create', 'paymentDebts.update', 'paymentDebts.delete', 'paymentDebts.payment',
      'reports.view', 'reports.finance',
    ],
  },
  {
    key: 'employee',
    name: 'จัดการพนักงาน',
    description: 'เห็นเฉพาะพนักงาน ลงเวลา ใบลา',
    permissions: [
      'dashboard.view', 'dashboard.employee',
      'employees.view', 'employees.create', 'employees.update', 'employees.delete',
      'employees.attendance', 'employees.leave',
      'attendance.view', 'leave.view',
    ],
  },
  {
    key: 'super_admin',
    name: 'จัดการยศ',
    description: 'Super Admin เห็นทั้งหมด และจัดการบัญชี/ยศได้',
    permissions: ALL_PERMISSIONS.map((p) => p.key),
  },
];

// ---------------------------------------------------------------------------
// Sidebar menu → permission mapping (used by frontend)
// ---------------------------------------------------------------------------

export const MENU_PERMISSION_MAP = {
  dashboard: 'dashboard.view',
  form: 'repair.create',
  calendar: 'calendar.view',
  'in-shop': 'repair.view',
  all: 'vehicles.view',
  productStock: 'stock.view',
  finance: 'finance.view',
  cashReserve: 'cashReserve.view',
  paymentDebts: 'paymentDebts.view',
  charts: 'reports.view',
  'shift-duty': 'employees.view',
  'employee-summary': 'employees.view',
  'roles-management': 'roles.view',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanString(value, maxLength = 255) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function uniqueCleanIds(values, maxLength = 64) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => cleanString(value, maxLength)).filter(Boolean))];
}

async function ensureColumn(sql) {
  try {
    await query(sql);
  } catch (error) {
    if (Number(error?.errno || 0) !== 1060) throw error;
  }
}

async function assertExistingRoleIds(roleIds = []) {
  const cleanRoleIds = uniqueCleanIds(roleIds, 64);
  if (cleanRoleIds.length === 0) return [];

  const placeholders = cleanRoleIds.map(() => '?').join(',');
  const rows = await query(
    `SELECT id FROM admin_roles WHERE id IN (${placeholders})`,
    cleanRoleIds
  );
  const foundIds = new Set((Array.isArray(rows) ? rows : []).map((row) => String(row.id)));
  const missingIds = cleanRoleIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    throw new Error('พบยศที่ไม่มีอยู่ในระบบ');
  }
  return cleanRoleIds;
}

async function assertExistingPermissionIds(permissionIds = []) {
  const cleanPermissionIds = uniqueCleanIds(permissionIds, 64);
  if (cleanPermissionIds.length === 0) return [];

  const placeholders = cleanPermissionIds.map(() => '?').join(',');
  const rows = await query(
    `SELECT id FROM admin_permissions WHERE id IN (${placeholders})`,
    cleanPermissionIds
  );
  const foundIds = new Set((Array.isArray(rows) ? rows : []).map((row) => String(row.id)));
  const missingIds = cleanPermissionIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    throw new Error('พบสิทธิ์ที่ไม่มีอยู่ในระบบ');
  }
  return cleanPermissionIds;
}

// ---------------------------------------------------------------------------
// Table Setup
// ---------------------------------------------------------------------------

let _tablesEnsured = false;

export async function ensureAdminRoleTables() {
  if (_tablesEnsured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS admin_roles (
      id VARCHAR(64) PRIMARY KEY,
      role_key VARCHAR(100) NOT NULL UNIQUE,
      role_name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      is_system TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS admin_permissions (
      id VARCHAR(64) PRIMARY KEY,
      permission_key VARCHAR(150) NOT NULL UNIQUE,
      permission_name VARCHAR(255) NOT NULL,
      group_name VARCHAR(100) NULL,
      description TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS admin_role_permissions (
      id VARCHAR(64) PRIMARY KEY,
      role_id VARCHAR(64) NOT NULL,
      permission_id VARCHAR(64) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_role_permission (role_id, permission_id),
      INDEX idx_rp_role_id (role_id),
      INDEX idx_rp_permission_id (permission_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS admin_user_roles (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      role_id VARCHAR(64) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_role (user_id, role_id),
      INDEX idx_ur_user_id (user_id),
      INDEX idx_ur_role_id (role_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Add email column to admin_users if not exists
  await ensureColumn('ALTER TABLE admin_users ADD COLUMN email VARCHAR(255) NULL');

  _tablesEnsured = true;
}

// ---------------------------------------------------------------------------
// Seed Default Roles & Permissions
// ---------------------------------------------------------------------------

let _seeded = false;

export async function ensureDefaultRolesAndPermissions() {
  if (_seeded) return;
  await ensureAdminRoleTables();

  // 1. Seed permissions
  for (const perm of ALL_PERMISSIONS) {
    const id = `perm-${perm.key.replace(/\./g, '-')}`;
    await query(
      `INSERT INTO admin_permissions (id, permission_key, permission_name, group_name)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), group_name = VALUES(group_name)`,
      [id, perm.key, perm.name, perm.group]
    );
  }

  // 2. Seed roles
  for (const role of ROLE_DEFINITIONS) {
    const roleId = `role-${role.key}`;
    await query(
      `INSERT INTO admin_roles (id, role_key, role_name, description, is_system)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), description = VALUES(description)`,
      [roleId, role.key, role.name, role.description]
    );

    // 3. Seed role-permission mappings
    for (const permKey of role.permissions) {
      const permId = `perm-${permKey.replace(/\./g, '-')}`;
      const rpId = `rp-${role.key}-${permKey.replace(/\./g, '-')}`;
      await query(
        `INSERT INTO admin_role_permissions (id, role_id, permission_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE id = id`,
        [rpId, roleId, permId]
      ).catch(() => {});
    }
  }

  _seeded = true;
}

// ---------------------------------------------------------------------------
// Get Admin User with Permissions
// ---------------------------------------------------------------------------

export async function getAdminUserWithPermissions(userId) {
  await ensureAdminRoleTables();

  const userIdStr = cleanString(userId, 64);
  if (!userIdStr) return null;

  // Get roles for this user
  const roleRows = await query(
    `SELECT r.id, r.role_key, r.role_name, r.description, r.is_system
     FROM admin_user_roles ur
     JOIN admin_roles r ON r.id = ur.role_id
     WHERE ur.user_id = ?
     ORDER BY r.role_name`,
    [userIdStr]
  );
  const roles = Array.isArray(roleRows) ? roleRows : [];

  // Get all permissions for all roles this user has
  const roleIds = roles.map((r) => String(r.id));
  let permissions = [];

  if (roleIds.length > 0) {
    const placeholders = roleIds.map(() => '?').join(',');
    const permRows = await query(
      `SELECT DISTINCT p.permission_key
       FROM admin_role_permissions rp
       JOIN admin_permissions p ON p.id = rp.permission_id
       WHERE rp.role_id IN (${placeholders})
       ORDER BY p.permission_key`,
      roleIds
    );
    permissions = Array.isArray(permRows) ? permRows.map((r) => r.permission_key) : [];
  }

  return {
    roles: roles.map((r) => r.role_name),
    roleIds: roles.map((r) => String(r.id)),
    roleKeys: roles.map((r) => r.role_key),
    permissions,
  };
}

// ---------------------------------------------------------------------------
// Permission Check Helpers
// ---------------------------------------------------------------------------

export function hasPermission(permissions, permissionKey) {
  if (!Array.isArray(permissions)) return false;
  // Super admin (dashboard.all) bypasses all checks
  if (permissions.includes('dashboard.all')) return true;
  return permissions.includes(permissionKey);
}

export function hasAnyPermission(permissions, permissionKeys = []) {
  if (!Array.isArray(permissions)) return false;
  if (permissions.includes('dashboard.all')) return true;
  return permissionKeys.some((key) => permissions.includes(key));
}

// ---------------------------------------------------------------------------
// API Permission Middleware
// ---------------------------------------------------------------------------

export async function requirePermission(request, permissionKey) {
  const admin = await getAuthorizedAdminFromRequest(request);
  if (!admin) {
    return { error: 'กรุณาเข้าสู่ระบบ', status: 401 };
  }

  await ensureDefaultRolesAndPermissions();

  const userPerms = await getAdminUserWithPermissions(admin.id);
  if (!userPerms || !hasPermission(userPerms.permissions, permissionKey)) {
    return { error: 'ไม่มีสิทธิ์เข้าถึง', status: 403 };
  }

  return { admin, permissions: userPerms.permissions, roles: userPerms.roles };
}

export async function requireAnyPermission(request, permissionKeys = []) {
  const admin = await getAuthorizedAdminFromRequest(request);
  if (!admin) {
    return { error: 'กรุณาเข้าสู่ระบบ', status: 401 };
  }

  await ensureDefaultRolesAndPermissions();

  const userPerms = await getAdminUserWithPermissions(admin.id);
  if (!userPerms || !hasAnyPermission(userPerms.permissions, permissionKeys)) {
    return { error: 'ไม่มีสิทธิ์เข้าถึง', status: 403 };
  }

  return { admin, permissions: userPerms.permissions, roles: userPerms.roles };
}

// ---------------------------------------------------------------------------
// Super Admin Protection
// ---------------------------------------------------------------------------

export async function isLastSuperAdmin(userId) {
  await ensureAdminRoleTables();

  // Count active users that have the super_admin role
  const rows = await query(
    `SELECT COUNT(DISTINCT ur.user_id) AS cnt
     FROM admin_user_roles ur
     JOIN admin_users u ON u.id = ur.user_id AND u.is_active = 1
     WHERE ur.role_id = 'role-super_admin'`
  );
  const count = Number(rows?.[0]?.cnt || 0);

  // Check if this user has super_admin role
  const userRoles = await query(
    `SELECT id FROM admin_user_roles WHERE user_id = ? AND role_id = 'role-super_admin' LIMIT 1`,
    [cleanString(userId, 64)]
  );
  const hasSuperAdmin = Array.isArray(userRoles) && userRoles.length > 0;

  return hasSuperAdmin && count <= 1;
}

// ---------------------------------------------------------------------------
// Admin User CRUD helpers
// ---------------------------------------------------------------------------

export async function listAdminUsers() {
  await ensureAdminRoleTables();
  await ensureDefaultRolesAndPermissions();

  const rows = await query(
    `SELECT u.id, u.username, u.display_name, u.email, u.is_active, u.created_at, u.updated_at, u.last_login_at
     FROM admin_users u
     ORDER BY u.created_at ASC`
  );
  const users = Array.isArray(rows) ? rows : [];

  // Load roles for each user
  const results = [];
  for (const user of users) {
    const roleRows = await query(
      `SELECT r.id, r.role_key, r.role_name
       FROM admin_user_roles ur
       JOIN admin_roles r ON r.id = ur.role_id
       WHERE ur.user_id = ?`,
      [String(user.id)]
    );
    results.push({
      id: String(user.id),
      username: user.username,
      display_name: user.display_name || '',
      email: user.email || '',
      is_active: Number(user.is_active) === 1,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
      roles: Array.isArray(roleRows) ? roleRows.map((r) => ({ id: r.id, key: r.role_key, name: r.role_name })) : [],
    });
  }
  return results;
}

export async function createAdminUser({ username, password, display_name, email, roleIds, is_active }) {
  await ensureAdminRoleTables();

  const usernameClean = cleanString(username, 100).toLowerCase();
  const passwordStr = String(password || '');
  if (!usernameClean || !passwordStr) throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');

  const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,50}$/;
  if (!USERNAME_PATTERN.test(usernameClean)) {
    throw new Error('ชื่อผู้ใช้ต้องเป็นตัวอักษรอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง ความยาว 3-50 ตัวอักษร');
  }

  // Check duplicate username
  const existing = await query(
    `SELECT id FROM admin_users WHERE LOWER(username) = ? LIMIT 1`,
    [usernameClean]
  );
  if (Array.isArray(existing) && existing.length > 0) {
    throw new Error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
  }

  const cleanRoleIds = await assertExistingRoleIds(roleIds);

  const userId = generateId('admin');
  const passwordHash = await bcrypt.hash(passwordStr, 10);

  await query(
    `INSERT INTO admin_users (id, username, password_hash, display_name, email, role, is_active)
     VALUES (?, ?, ?, ?, ?, 'admin', ?)`,
    [userId, usernameClean, passwordHash, cleanString(display_name, 255), cleanString(email, 255), is_active !== false ? 1 : 0]
  );

  // Assign roles
  if (cleanRoleIds.length > 0) {
    for (const roleId of cleanRoleIds) {
      await query(
        `INSERT INTO admin_user_roles (id, user_id, role_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE id = id`,
        [generateId('ur'), userId, roleId]
      );
    }
  }

  return userId;
}

export async function updateAdminUser(userId, { username, display_name, email, roleIds, is_active }) {
  await ensureAdminRoleTables();

  const userIdStr = cleanString(userId, 64);
  if (!userIdStr) throw new Error('Invalid user ID');

  // Check if trying to deactivate last super admin
  if (is_active === false || is_active === 0) {
    if (await isLastSuperAdmin(userIdStr)) {
      throw new Error('ไม่สามารถปิดใช้งานผู้ดูแลระบบสูงสุดคนสุดท้ายได้');
    }
  }

  const sets = [];
  const params = [];

  if (username !== undefined) {
    const usernameClean = cleanString(username, 100).toLowerCase();
    const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,50}$/;
    if (!USERNAME_PATTERN.test(usernameClean)) {
      throw new Error('ชื่อผู้ใช้ต้องเป็นตัวอักษรอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง ความยาว 3-50 ตัวอักษร');
    }
    // Check duplicate (exclude self)
    const existing = await query(
      `SELECT id FROM admin_users WHERE LOWER(username) = ? AND id <> ? LIMIT 1`,
      [usernameClean, userIdStr]
    );
    if (Array.isArray(existing) && existing.length > 0) {
      throw new Error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
    }
    sets.push('username = ?');
    params.push(usernameClean);
  }

  if (display_name !== undefined) {
    sets.push('display_name = ?');
    params.push(cleanString(display_name, 255));
  }

  if (email !== undefined) {
    sets.push('email = ?');
    params.push(cleanString(email, 255));
  }

  if (is_active !== undefined) {
    sets.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  if (sets.length > 0) {
    params.push(userIdStr);
    await query(`UPDATE admin_users SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  // Update roles if provided
  if (Array.isArray(roleIds)) {
    const cleanRoleIds = await assertExistingRoleIds(roleIds);

    // Check if removing super_admin from last super admin
    if (await isLastSuperAdmin(userIdStr) && !cleanRoleIds.includes('role-super_admin')) {
      throw new Error('ไม่สามารถถอดสิทธิ์ผู้ดูแลระบบคนสุดท้ายได้');
    }

    // Remove existing roles
    await query(`DELETE FROM admin_user_roles WHERE user_id = ?`, [userIdStr]);

    // Add new roles
    for (const roleId of cleanRoleIds) {
      await query(
        `INSERT INTO admin_user_roles (id, user_id, role_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE id = id`,
        [generateId('ur'), userIdStr, roleId]
      );
    }
  }
}

export async function changeAdminPassword(userId, newPassword) {
  const userIdStr = cleanString(userId, 64);
  const passwordStr = String(newPassword || '');
  if (!userIdStr || !passwordStr) throw new Error('Invalid data');

  const passwordHash = await bcrypt.hash(passwordStr, 10);
  await query(
    `UPDATE admin_users SET password_hash = ? WHERE id = ?`,
    [passwordHash, userIdStr]
  );
}

export async function deleteAdminUser(userId) {
  const userIdStr = cleanString(userId, 64);
  if (!userIdStr) throw new Error('Invalid user ID');

  if (await isLastSuperAdmin(userIdStr)) {
    throw new Error('ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายได้');
  }

  // Delete user roles
  await query(`DELETE FROM admin_user_roles WHERE user_id = ?`, [userIdStr]);
  // Delete sessions
  await query(`DELETE FROM admin_sessions WHERE user_id = ?`, [userIdStr]).catch(() => {});
  // Delete user
  await query(`DELETE FROM admin_users WHERE id = ?`, [userIdStr]);
}

// ---------------------------------------------------------------------------
// Role CRUD helpers
// ---------------------------------------------------------------------------

export async function listRoles() {
  await ensureAdminRoleTables();
  await ensureDefaultRolesAndPermissions();

  const roles = await query(
    `SELECT r.id, r.role_key, r.role_name, r.description, r.is_system,
            (SELECT COUNT(*) FROM admin_user_roles ur WHERE ur.role_id = r.id) as user_count,
            (SELECT COUNT(*) FROM admin_role_permissions rp WHERE rp.role_id = r.id) as permission_count
     FROM admin_roles r
     ORDER BY r.created_at ASC`
  );
  const roleRows = Array.isArray(roles) ? roles : [];
  const results = [];

  for (const role of roleRows) {
    const permRows = await query(
      `SELECT p.id, p.permission_key, p.permission_name, p.group_name
       FROM admin_role_permissions rp
       JOIN admin_permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = ?
       ORDER BY p.group_name, p.permission_key`,
      [String(role.id)]
    );

    results.push({
      id: String(role.id),
      role_key: role.role_key,
      role_name: role.role_name,
      description: role.description || '',
      is_system: Number(role.is_system) === 1,
      user_count: Number(role.user_count || 0),
      permission_count: Number(role.permission_count || 0),
      permissions: Array.isArray(permRows) ? permRows.map((p) => ({
        id: String(p.id),
        permission_key: p.permission_key,
        permission_name: p.permission_name,
        group_name: p.group_name || '',
      })) : [],
    });
  }

  return results;
}

export async function getRoleWithPermissions(roleId) {
  await ensureAdminRoleTables();

  const roleIdStr = cleanString(roleId, 64);
  const roles = await query(`SELECT * FROM admin_roles WHERE id = ? LIMIT 1`, [roleIdStr]);
  const role = Array.isArray(roles) && roles.length ? roles[0] : null;
  if (!role) return null;

  const permRows = await query(
    `SELECT p.id, p.permission_key, p.permission_name, p.group_name
     FROM admin_role_permissions rp
     JOIN admin_permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ?
     ORDER BY p.group_name, p.permission_key`,
    [roleIdStr]
  );

  return {
    id: String(role.id),
    role_key: role.role_key,
    role_name: role.role_name,
    description: role.description || '',
    is_system: Number(role.is_system) === 1,
    permissions: Array.isArray(permRows) ? permRows.map((p) => ({
      id: String(p.id),
      key: p.permission_key,
      name: p.permission_name,
      group: p.group_name || '',
    })) : [],
  };
}

export async function updateRolePermissions(roleId, permissionIds = []) {
  await ensureAdminRoleTables();

  const roleIdStr = cleanString(roleId, 64);
  if (!roleIdStr) throw new Error('Invalid role ID');

  const roleRows = await query(
    `SELECT id FROM admin_roles WHERE id = ? LIMIT 1`,
    [roleIdStr]
  );
  if (!Array.isArray(roleRows) || roleRows.length === 0) {
    throw new Error('ไม่พบยศ');
  }

  const cleanPermissionIds = await assertExistingPermissionIds(permissionIds);

  // Remove existing permissions for this role
  await query(`DELETE FROM admin_role_permissions WHERE role_id = ?`, [roleIdStr]);

  // Add new permissions
  for (const permId of cleanPermissionIds) {
    await query(
      `INSERT INTO admin_role_permissions (id, role_id, permission_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [generateId('rp'), roleIdStr, permId]
    );
  }
}

export async function listAllPermissions() {
  await ensureAdminRoleTables();
  await ensureDefaultRolesAndPermissions();

  const rows = await query(
    `SELECT id, permission_key, permission_name, group_name
     FROM admin_permissions
     ORDER BY group_name, permission_key`
  );
  return Array.isArray(rows) ? rows.map((r) => ({
    id: String(r.id),
    key: r.permission_key,
    name: r.permission_name,
    group: r.group_name || '',
  })) : [];
}
