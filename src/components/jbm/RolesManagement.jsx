import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Plus,
  Edit3,
  Trash2,
  Settings,
  CheckCircle2,
  X,
  Lock,
  AlertCircle
} from 'lucide-react';

const API_USERS = '/api/admin/users';
const API_ROLES = '/api/admin/roles';
const API_PERMISSIONS = '/api/admin/permissions';

export default function RolesManagement({
  headers = () => ({}),
  adminProfile = null,
  hasPermission = () => false,
}) {
  const canViewRoles = hasPermission('roles.view');
  const adminName = adminProfile?.displayName || adminProfile?.username || '';
  const canCreateUsers = hasPermission('adminUsers.create');
  const canUpdateUsers = hasPermission('adminUsers.update');
  const canDeleteUsers = hasPermission('adminUsers.delete');
  const canChangePasswords = hasPermission('adminUsers.password');

  const [activeTab, setActiveTab] = useState('users');
  
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saveError, setSaveError] = useState('');
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Data load
  const loadData = useCallback(async () => {
    if (!canViewRoles) {
      setRoles([]);
      setUsers([]);
      setPermissions([]);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [uRes, rRes, pRes] = await Promise.all([
        fetch(API_USERS, { headers: headers() }),
        fetch(API_ROLES, { headers: headers() }),
        fetch(API_PERMISSIONS, { headers: headers() })
      ]);
      
      const uData = await uRes.json().catch(() => ({}));
      const rData = await rRes.json().catch(() => ({}));
      const pData = await pRes.json().catch(() => ({}));
      
      if (!uRes.ok) throw new Error(uData.error || 'Failed to load users');
      if (!rRes.ok) throw new Error(rData.error || 'Failed to load roles');
      if (!pRes.ok) throw new Error(pData.error || 'Failed to load permissions');
      
      setUsers(Array.isArray(uData.users) ? uData.users : []);
      setRoles(Array.isArray(rData.roles) ? rData.roles : []);
      setPermissions(Array.isArray(pData.permissions) ? pData.permissions : []);
    } catch (err) {
      console.error('[RolesManagement] load data failed', err);
      setUsers([]);
      setRoles([]);
      setPermissions([]);
      setError(err.message || 'โหลดข้อมูลจัดการยศไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [canViewRoles, headers]);

  useEffect(() => {
    if (!canViewRoles) return;
    loadData();
  }, [canViewRoles, loadData]);

  // Actions
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSaveError('');
    const formData = new FormData(e.target);
    const data = {
      display_name: formData.get('display_name'),
      email: formData.get('email'),
      role_ids: formData.getAll('roles')
    };
    
    if (!editingUser?.id) {
      data.username = formData.get('username');
      data.is_active = 1;
      data.password = formData.get('password');
      if (data.password !== formData.get('confirm_password')) {
        setSaveError('รหัสผ่านไม่ตรงกัน');
        return;
      }
    }

    try {
      const url = editingUser?.id ? `${API_USERS}/${editingUser.id}` : API_USERS;
      const method = editingUser?.id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify(data)
      });
      
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || result.message || 'บันทึกข้อมูลไม่สำเร็จ');
      
      setShowUserModal(false);
      loadData();
    } catch (err) {
      setSaveError(err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('ยืนยันการลบบัญชีผู้ใช้?')) return;
    try {
      const res = await fetch(`${API_USERS}/${id}`, {
        method: 'DELETE',
        headers: headers()
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to delete user');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const password = formData.get('password');
    if (password !== formData.get('confirm_password')) {
      alert('รหัสผ่านไม่ตรงกัน');
      return;
    }
    try {
      const res = await fetch(`${API_USERS}/${editingUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ password })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to change password');
      setShowPasswordModal(false);
      alert('เปลี่ยนรหัสผ่านสำเร็จ');
    } catch (err) {
      alert(err.message);
    }
  };

  const safeUsers = useMemo(() => (Array.isArray(users) ? users : []), [users]);
  const safeRoles = useMemo(() => (Array.isArray(roles) ? roles : []), [roles]);
  const safePermissions = useMemo(() => (Array.isArray(permissions) ? permissions : []), [permissions]);
  const permissionsByGroup = useMemo(() => {
    return safePermissions.reduce((groups, permission) => {
      const group = permission?.group || permission?.group_name || 'อื่น ๆ';
      if (!groups[group]) groups[group] = [];
      groups[group].push(permission);
      return groups;
    }, {});
  }, [safePermissions]);

  if (!canViewRoles) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        ไม่มีสิทธิ์เข้าถึงหน้าจัดการยศ
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            จัดการยศและสิทธิ์
          </h2>
          <p className="text-sm text-slate-500 mt-1">จัดการบัญชีผู้ดูแลระบบและการเข้าถึง</p>
          {adminName && <p className="text-xs text-slate-400 mt-1">ผู้ใช้งาน: {adminName}</p>}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('users')}
        >
          <div className="flex items-center gap-2"><UserCheck className="w-4 h-4" /> บัญชีผู้ใช้</div>
        </button>
        <button
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'roles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('roles')}
        >
          <div className="flex items-center gap-2"><Settings className="w-4 h-4" /> ยศและสิทธิ์</div>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">กำลังโหลด...</div>
      ) : activeTab === 'users' ? (
        <div className="space-y-4">
          {canCreateUsers && (
            <div className="flex justify-end">
              <button
                onClick={() => { setEditingUser(null); setSaveError(''); setShowUserModal(true); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> สร้างบัญชีผู้ใช้
              </button>
            </div>
          )}
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">ชื่อผู้ใช้</th>
                    <th className="px-6 py-4">ชื่อแสดงผล</th>
                    <th className="px-6 py-4">อีเมล</th>
                    <th className="px-6 py-4">ยศ</th>
                    <th className="px-6 py-4 text-center">สถานะ</th>
                    <th className="px-6 py-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{u.username}</td>
                      <td className="px-6 py-4 text-slate-600">{u.display_name || '-'}</td>
                      <td className="px-6 py-4 text-slate-500">{u.email || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(u.roles) ? u.roles : []).map(r => (
                            <span key={r.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-100">
                              {r.name || r.role_name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {u.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex items-center justify-end gap-2">
                        {canUpdateUsers && (
                          <button onClick={() => { setEditingUser(u); setSaveError(''); setShowUserModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {canChangePasswords && (
                          <button onClick={() => { setEditingUser(u); setShowPasswordModal(true); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="เปลี่ยนรหัสผ่าน">
                            <Lock className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteUsers && (
                          <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {safeUsers.length === 0 && (
                    <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">ไม่พบข้อมูลผู้ใช้</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">ชื่อยศ</th>
                    <th className="px-6 py-4">สิทธิ์การใช้งาน</th>
                    <th className="px-6 py-4 text-center">ประเภท</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeRoles.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold text-slate-900">{r.role_name}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(r.permissions) ? r.permissions : []).map(p => (
                            <span key={p.id} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium border border-slate-200" title={p.permission_name}>
                              {p.permission_key || p.key}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {r.is_system ? (
                          <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">ระบบ</span>
                        ) : (
                          <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">กำหนดเอง</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {safeRoles.length === 0 && (
                    <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-500">ไม่พบข้อมูลยศ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="mb-4 text-base font-bold text-slate-800">รายการสิทธิ์ทั้งหมด</h3>
            {safePermissions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
                ไม่พบข้อมูลสิทธิ์
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(permissionsByGroup).map(([group, groupPermissions]) => (
                  <div key={group} className="rounded-xl border border-slate-200 p-4">
                    <p className="mb-3 text-sm font-extrabold text-slate-800">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(groupPermissions) ? groupPermissions : []).map((permission) => (
                        <span key={permission.id || permission.key || permission.permission_key} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600" title={permission.name || permission.permission_name || ''}>
                          {permission.key || permission.permission_key || '-'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">{editingUser ? 'แก้ไขผู้ใช้' : 'สร้างบัญชีผู้ใช้'}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              {saveError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {saveError}
                </div>
              )}
              <form id="user-form" onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อผู้ใช้ (Username) *</label>
                  <input type="text" name="username" defaultValue={editingUser?.username} required disabled={!!editingUser} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อแสดงผล</label>
                  <input type="text" name="display_name" defaultValue={editingUser?.display_name} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">อีเมล</label>
                  <input type="email" name="email" defaultValue={editingUser?.email} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                
                {!editingUser && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">รหัสผ่าน *</label>
                      <input type="password" name="password" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">ยืนยันรหัสผ่าน *</label>
                      <input type="password" name="confirm_password" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">ยศที่ได้รับ *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {safeRoles.map(r => (
                      <label key={r.id} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" name="roles" value={r.id} defaultChecked={(Array.isArray(editingUser?.roles) ? editingUser.roles : []).some(ur => ur.id === r.id)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-700">{r.role_name}</span>
                      </label>
                    ))}
                  </div>
                </div>


              </form>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowUserModal(false)} className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">ยกเลิก</button>
              <button type="submit" form="user-form" className="px-6 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">เปลี่ยนรหัสผ่าน</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">บัญชี: <span className="font-bold text-slate-800">{editingUser?.username}</span></p>
              <form id="password-form" onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">รหัสผ่านใหม่ *</label>
                  <input type="password" name="password" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">ยืนยันรหัสผ่านใหม่ *</label>
                  <input type="password" name="confirm_password" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </form>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowPasswordModal(false)} className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">ยกเลิก</button>
              <button type="submit" form="password-form" className="px-6 py-2 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm">บันทึกรหัสผ่าน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
