import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, MoreVertical, Edit2, ShieldAlert, Key, X, AlertTriangle, Save, Check } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function AdminUsersRoles() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [editingUser, setEditingUser] = useState<any>(null);
  const [confirmLockUser, setConfirmLockUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null); // For permission management

    const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, rRes, pRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get('/api/roles'),
        axios.get('/api/roles/permissions')
      ]);
      setUsers(uRes.data);
      setRoles(rRes.data);
      setPermissions(pRes.data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load access management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`/api/users/${editingUser.id}`, {
        status: editingUser.status,
        roles: editingUser.roles
      });
      toast.success(`User ${editingUser.name} roles updated successfully`);
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update user roles');
    }
  };

  const toggleLock = async (user: any) => {
    try {
      await axios.put(`/api/users/${user.id}`, {
        locked: !user.locked
      });
      toast.success(`User access ${!user.locked ? 'locked' : 'restored'} temporarily`);
      setConfirmLockUser(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to modify user lock status');
    }
  };

  const handleRoleToggle = (roleCode: string) => {
    if (!editingUser) return;
    const currentRoles = editingUser.roles || [];
    if (currentRoles.includes(roleCode)) {
      setEditingUser({ ...editingUser, roles: currentRoles.filter((r: string) => r !== roleCode) });
    } else {
      setEditingUser({ ...editingUser, roles: [...currentRoles, roleCode] });
    }
  };

  const handlePermissionToggle = (permKey: string) => {
    if (!selectedRole) return;
    const currentPerms = selectedRole.permissions || [];
    if (currentPerms.includes(permKey)) {
      setSelectedRole({ ...selectedRole, permissions: currentPerms.filter((p: string) => p !== permKey) });
    } else {
      setSelectedRole({ ...selectedRole, permissions: [...currentPerms, permKey] });
    }
  };

  const saveRolePermissions = async () => {
    if (!selectedRole) return;
    try {
      await axios.put(`/api/roles/${selectedRole.id}/permissions`, {
         permissions: selectedRole.permissions
      });
      toast.success(`Permissions updated for role: ${selectedRole.role_name}`);
      fetchData();
    } catch (e) {
      toast.error('Failed to update role permissions');
    }
  };

  return (
    <div className="p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h3 className="text-xl font-bold text-slate-800">User & Role Management</h3>
          <p className="text-sm text-slate-500 font-medium">Manage system access, roles, and administrative privileges</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-blue-600" />
              Role Groups
            </h4>
            <div className="space-y-2">
              {roles.map(role => {
                const userCount = users.filter(u => u.roles && u.roles.includes(role.role_code)).length;
                const isSelected = selectedRole?.id === role.id;
                return (
                  <button 
                    key={role.id} 
                    onClick={() => setSelectedRole(role)}
                    className={`w-full text-left px-3 py-3 rounded-lg border text-sm font-bold transition-all flex justify-between items-center group ${isSelected ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-transparent hover:border-slate-200 text-slate-600'}`}
                  >
                    <div className="flex flex-col">
                       <span>{role.role_name}</span>
                       <span className="text-[10px] text-slate-400 font-medium mt-0.5">{role.role_code}</span>
                    </div>
                    <span className={`text-xs py-1 px-2.5 rounded-full ${isSelected ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                      {userCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Permissions Editor or User List */}
        <div className="lg:col-span-3 space-y-6">
          {/* Permission Editor when a role is selected */}
          {selectedRole && (
            <div className="bg-white border border-blue-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
                 <div>
                   <h3 className="font-bold text-blue-900 flex items-center gap-2">
                     <Key className="w-4 h-4 text-blue-600" />
                     {selectedRole.role_name} Permissions
                   </h3>
                   <p className="text-xs text-slate-500 mt-1">{selectedRole.description || 'Modify access control lists for this role group'}</p>
                 </div>
                 <div className="flex gap-2">
                   <button 
                     onClick={saveRolePermissions}
                     className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                   >
                     <Save className="w-4 h-4" /> Save Perms
                   </button>
                   <button 
                     onClick={() => setSelectedRole(null)}
                     className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                   >
                     Close
                   </button>
                 </div>
              </div>
              <div className="p-6">
                 {/* Group perms by module */}
                 {Array.from(new Set(permissions.map(p => p.module_name))).map(module => (
                   <div key={module} className="mb-6 last:mb-0">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">{module} Module</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                       {permissions.filter(p => p.module_name === module).map(perm => {
                         const hasPerm = selectedRole.permissions?.includes(perm.permission_key);
                         return (
                           <div 
                             key={perm.id} 
                             onClick={() => handlePermissionToggle(perm.permission_key)}
                             className={`p-3 rounded-lg border cursor-pointer transition-all ${hasPerm ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                           >
                              <div className="flex items-start justify-between">
                                <span className={`text-[11px] font-bold block ${hasPerm ? 'text-blue-800' : 'text-slate-600'}`}>
                                  {perm.permission_key}
                                </span>
                                {hasPerm && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed bg-white/50 rounded p-1.5">{perm.description}</p>
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {/* User List */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                    <th className="p-4">User</th>
                    <th className="p-4">Assigned Roles</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                            {user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{user.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                           {(user.roles || []).map((rc: string) => (
                             <span key={rc} className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider">
                               {rc}
                             </span>
                           ))}
                           {(!user.roles || user.roles.length === 0) && (
                             <span className="text-[10px] text-slate-400 italic font-medium">None</span>
                           )}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-600">
                        {user.department || '-'}
                      </td>
                      <td className="p-4">
                        {user.locked ? (
                          <span className="inline-flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border border-rose-100">
                            <ShieldAlert className="w-3 h-3" /> Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border border-emerald-100">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> {user.status}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => setEditingUser(user)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors mr-1">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmLockUser(user)} className={`p-1.5 rounded transition-colors ${user.locked ? 'text-emerald-500 hover:bg-emerald-50' : 'text-rose-500 hover:bg-rose-50'}`} title={user.locked ? "Unlock User" : "Lock User"}>
                          {user.locked ? <Shield className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                Assign Roles ({editingUser.name})
              </h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Roles Configuration (Multi-Select)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {roles.map(r => {
                     const isSelected = editingUser.roles?.includes(r.role_code);
                     return (
                       <div 
                         key={r.id} 
                         onClick={() => handleRoleToggle(r.role_code)}
                         className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                       >
                         <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                            {isSelected && <Check className="w-3 h-3" />}
                         </div>
                         <div>
                            <span className={`block text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{r.role_name}</span>
                            <span className="block text-[9px] font-mono text-slate-400 mt-0.5">{r.role_code}</span>
                         </div>
                       </div>
                     )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Account Status</label>
                <select 
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({...editingUser, status: e.target.value})}
                  className="w-full px-3 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Active">Active / Unrestricted</option>
                  <option value="Suspended">Suspended / Deactivated</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">Changing a user's status to suspended immediately invalidates their session and revokes access to the portal.</p>
              </div>
              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-xl transition-all"
                >
                  Deploy Access Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmLockUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200 p-6 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmLockUser.locked ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {confirmLockUser.locked ? <Shield className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {confirmLockUser.locked ? 'Unlock User?' : 'Lock User Access?'}
            </h3>
            <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
              Are you sure you want to {confirmLockUser.locked ? 'restore access for' : 'revoke access from'} 
              <span className="font-bold text-slate-800 ml-1 block">{confirmLockUser.name}</span>
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmLockUser(null)}
                className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => toggleLock(confirmLockUser)}
                className={`flex-1 px-4 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-colors ${confirmLockUser.locked ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
