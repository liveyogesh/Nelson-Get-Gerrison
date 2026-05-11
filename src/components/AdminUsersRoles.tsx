import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Edit2, ShieldAlert, Key, X, AlertTriangle, Save, Check, Search, Plus, Trash2, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function AdminUsersRoles() {
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES'>('USERS');
  
  // Data State
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // User State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [confirmLockUser, setConfirmLockUser] = useState<any>(null);

  // Role State
  const [roleSearch, setRoleSearch] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);
  const [newRole, setNewRole] = useState({ role_name: '', role_code: '', description: '', active_status: true });
  
  const [editingRoleBasic, setEditingRoleBasic] = useState<any>(null);
  const [deletingRole, setDeletingRole] = useState<any>(null);

  // Permission View State  
  const [managingRolePerms, setManagingRolePerms] = useState<any>(null);
  const [permSearch, setPermSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, rRes, pRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get('/api/roles'),
        axios.get('/api/roles/permissions') // returns grouped perms object
      ]);
      setUsers(uRes.data);
      setRoles(rRes.data);
      setPermissions(pRes.data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load RBAC data');
    } finally {
      setLoading(false);
    }
  };

  // --- USER HANDLERS ---
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
      await axios.put(`/api/users/${user.id}`, { locked: !user.locked });
      toast.success(`User access ${!user.locked ? 'locked' : 'restored'} successfully`);
      setConfirmLockUser(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to modify user lock status');
    }
  };

  const handleUserRoleToggle = (roleCode: string) => {
    if (!editingUser) return;
    const currentRoles = editingUser.roles || [];
    if (currentRoles.includes(roleCode)) {
      setEditingUser({ ...editingUser, roles: currentRoles.filter((r: string) => r !== roleCode) });
    } else {
      setEditingUser({ ...editingUser, roles: [...currentRoles, roleCode] });
    }
  };


  // --- ROLE HANDLERS ---
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/roles', newRole);
      toast.success('Role created successfully');
      setCreatingRole(false);
      setNewRole({ role_name: '', role_code: '', description: '', active_status: true });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create role');
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`/api/roles/${editingRoleBasic.id}`, editingRoleBasic);
      toast.success('Role updated successfully');
      setEditingRoleBasic(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDeleteRole = async () => {
    try {
      await axios.delete(`/api/roles/${deletingRole.id}`);
      toast.success('Role deleted successfully');
      setDeletingRole(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete role');
    }
  };

  const toggleRolePermission = async (permKey: string) => {
    if (!managingRolePerms) return;
    const currentList = [...managingRolePerms.permissions];
    const isAssigned = currentList.some(p => p.permission_key === permKey);
    
    try {
      if (isAssigned) {
        await axios.post(`/api/roles/${managingRolePerms.id}/permissions/revoke`, { permission_key: permKey });
        setManagingRolePerms({
           ...managingRolePerms,
           permissions: currentList.filter(p => p.permission_key !== permKey)
        });
      } else {
        await axios.post(`/api/roles/${managingRolePerms.id}/permissions/assign`, { permission_key: permKey });
        setManagingRolePerms({
           ...managingRolePerms,
           permissions: [...currentList, { permission_key: permKey }]
        });
      }
      toast.success('Permission updated');
    } catch(err: any) {
       toast.error(err.response?.data?.error || 'Failed to update permission');
    }
  };

  // --- RENDER HELPERS ---
  const filteredRoles = roles.filter(r => r.role_name.toLowerCase().includes(roleSearch.toLowerCase()) || r.role_code.toLowerCase().includes(roleSearch.toLowerCase()));

  // Role Perms Screen
  if (managingRolePerms) {
    return (
      <div className="p-6 pb-20 animate-in fade-in">
        <button onClick={() => setManagingRolePerms(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to RBAC Dashboard
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-blue-50 border border-blue-200 p-6 rounded-2xl">
          <div>
            <h2 className="text-2xl font-black text-blue-900 flex items-center gap-3">
              <Key className="w-6 h-6 text-blue-600" />
              Manage {managingRolePerms.role_name}
            </h2>
            <p className="text-blue-700 font-medium mt-1">Configure fine-grained access control and module permissions.</p>
          </div>
          <div className="flex gap-4">
             <div className="relative">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Search permissions..." 
                 value={permSearch}
                 onChange={(e) => setPermSearch(e.target.value)}
                 className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 bg-white"
               />
             </div>
          </div>
        </div>

        <div className="space-y-6">
          {Object.keys(permissions).map(moduleName => {
             const modulePerms = permissions[moduleName].filter((p: any) => 
               p.permission_key.toLowerCase().includes(permSearch.toLowerCase()) || 
               (p.description && p.description.toLowerCase().includes(permSearch.toLowerCase()))
             );
             if (modulePerms.length === 0) return null;

             return (
               <div key={moduleName} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                 <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                   <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Module: {moduleName}</h3>
                   <div className="flex gap-2">
                     <button onClick={async () => {
                        const keys = modulePerms.map((p:any) => p.permission_key);
                        try {
                           // Quick sequential assigning (or we could use PUT if we restructure)
                           const currentKeys = managingRolePerms.permissions.map((p:any) => p.permission_key);
                           const newKeys = Array.from(new Set([...currentKeys, ...keys]));
                           await axios.put(`/api/roles/${managingRolePerms.id}/permissions`, { permissions: newKeys });
                           setManagingRolePerms({ ...managingRolePerms, permissions: newKeys.map(k => ({permission_key: k})) });
                           toast.success('Module permissions fully assigned');
                        } catch(e:any) { toast.error(e.response?.data?.error || 'Error assigning'); }
                     }} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">Select All</button>
                     <button onClick={async () => {
                        const keysToRemove = modulePerms.map((p:any) => p.permission_key);
                        try {
                           const currentKeys = managingRolePerms.permissions.map((p:any) => p.permission_key);
                           const newKeys = currentKeys.filter((k:any) => !keysToRemove.includes(k));
                           await axios.put(`/api/roles/${managingRolePerms.id}/permissions`, { permissions: newKeys });
                           setManagingRolePerms({ ...managingRolePerms, permissions: newKeys.map((k:any) => ({permission_key: k})) });
                           toast.success('Module permissions removed');
                        } catch(e:any) { toast.error(e.response?.data?.error || 'Error removing'); }
                     }} className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200">Deselect All</button>
                   </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {modulePerms.map((perm: any) => {
                       const isAssigned = managingRolePerms.permissions.some((p: any) => p.permission_key === perm.permission_key);
                       return (
                         <div 
                            key={perm.id} 
                            onClick={() => toggleRolePermission(perm.permission_key)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isAssigned ? 'bg-blue-50 border-blue-400 shadow-md transform -translate-y-0.5' : 'bg-slate-50 border-transparent hover:border-slate-300'}`}
                         >
                            <div className="flex items-start justify-between gap-2">
                               <span className={`text-sm font-black break-words ${isAssigned ? 'text-blue-900' : 'text-slate-700'}`}>{perm.permission_key}</span>
                               <div className={`w-5 h-5 shrink-0 rounded flex items-center justify-center transition-colors ${isAssigned ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                 {isAssigned && <Check className="w-3 h-3 text-white" />}
                               </div>
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed bg-white/60 p-2 rounded">{perm.description || 'No description provided'}</p>
                         </div>
                       );
                    })}
                 </div>
               </div>
             )
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-20 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900">RBAC Governance</h2>
        <p className="text-slate-500 font-medium mt-1">Enterprise role and permission management system.</p>
      </div>

      <div className="flex gap-4 border-b border-slate-200 mb-6">
         <button onClick={() => setActiveTab('USERS')} className={`px-4 py-3 font-bold text-sm tracking-wide border-b-2 transition-colors ${activeTab === 'USERS' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            User Assignments
         </button>
         <button onClick={() => setActiveTab('ROLES')} className={`px-4 py-3 font-bold text-sm tracking-wide border-b-2 transition-colors ${activeTab === 'ROLES' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Role Matrix
         </button>
      </div>

      {activeTab === 'USERS' && (
        <div className="space-y-6 animate-in fade-in">
           {/* Exact same user table from before but simplified rendering mapping */}
           <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
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
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Active
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => setEditingUser(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmLockUser(user)} className={`p-2 rounded-lg transition-colors ${user.locked ? 'text-emerald-500 hover:bg-emerald-50' : 'text-rose-500 hover:bg-rose-50'}`} title={user.locked ? "Unlock User" : "Lock User"}>
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
      )}

      {activeTab === 'ROLES' && (
        <div className="space-y-6 animate-in fade-in">
           <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
             <div className="relative w-full max-w-sm">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Search roles..." 
                 value={roleSearch}
                 onChange={(e) => setRoleSearch(e.target.value)}
                 className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 bg-slate-50"
               />
             </div>
             <button onClick={() => setCreatingRole(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm">
               <Plus className="w-4 h-4" /> Create Role
             </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRoles.map(role => (
                <div key={role.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="text-lg font-black text-slate-800">{role.role_name}</h3>
                       <p className="text-xs font-mono font-bold text-slate-400 mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">{role.role_code}</p>
                     </div>
                     <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider border ${role.active_status ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {role.active_status ? 'Active' : 'Inactive'}
                     </span>
                  </div>
                  
                  <p className="text-sm text-slate-600 font-medium flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100">{role.description || 'No description provided.'}</p>
                  
                  <div className="grid grid-cols-4 gap-2 my-6">
                    <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest leading-tight h-6">Users</p>
                      <p className="text-xl font-black text-slate-800">{role.assigned_users_count || 0}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest leading-tight h-6">Perms</p>
                      <p className="text-xl font-black text-blue-600">{role.total_permissions_count || 0}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest leading-tight h-6">Depts</p>
                      <p className="text-xl font-black text-slate-700">{role.departments_count || 0}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-rose-50 border border-rose-100">
                      <p className="text-[9px] font-bold uppercase text-rose-400 tracking-widest leading-tight h-6">Risk</p>
                      <p className="text-xl font-black text-rose-600">{role.high_risk_count || 0}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-slate-100 pt-4">
                     <button onClick={() => setManagingRolePerms(role)} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm py-2 rounded-xl transition-colors">
                       Manage Permissions
                     </button>
                     <button onClick={() => setEditingRoleBasic(role)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors">
                       <Edit2 className="w-4 h-4" />
                     </button>
                     {role.assigned_users_count === 0 && !['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(role.role_code) && (
                       <button onClick={() => setDeletingRole(role)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     )}
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* MODALS */}
      {(creatingRole || editingRoleBasic) && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]">
           <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-slate-800">{creatingRole ? 'Create New Role' : 'Edit Role Base Info'}</h3>
               <button onClick={() => {setCreatingRole(false); setEditingRoleBasic(null);}} className="p-1 hover:bg-slate-200 rounded text-slate-500"><X className="w-5 h-5"/></button>
             </div>
             <form onSubmit={creatingRole ? handleCreateRole : handleUpdateRole} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Role Name</label>
                  <input type="text" required value={creatingRole ? newRole.role_name : editingRoleBasic.role_name} onChange={(e) => creatingRole ? setNewRole({...newRole, role_name: e.target.value}) : setEditingRoleBasic({...editingRoleBasic, role_name: e.target.value})} className="w-full border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-medium" />
                </div>
                {creatingRole && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Role Code</label>
                    <input type="text" required value={newRole.role_code} onChange={(e) => setNewRole({...newRole, role_code: e.target.value.toUpperCase().replace(/\s+/g, '_')})} className="w-full border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs uppercase" placeholder="E.g. NIGHT_SUPERVISOR" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description</label>
                  <textarea rows={3} value={creatingRole ? newRole.description : editingRoleBasic.description} onChange={(e) => creatingRole ? setNewRole({...newRole, description: e.target.value}) : setEditingRoleBasic({...editingRoleBasic, description: e.target.value})} className="w-full border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 text-sm font-medium"></textarea>
                </div>
                <div className="flex items-center gap-3 pt-2">
                   <input type="checkbox" id="activeStatus" checked={creatingRole ? newRole.active_status : editingRoleBasic.active_status} onChange={(e) => creatingRole ? setNewRole({...newRole, active_status: e.target.checked}) : setEditingRoleBasic({...editingRoleBasic, active_status: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                   <label htmlFor="activeStatus" className="text-sm font-bold text-slate-700">Active Status</label>
                </div>
                <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end gap-3">
                   <button type="button" onClick={() => {setCreatingRole(false); setEditingRoleBasic(null);}} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                   <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md">Save Settings</button>
                </div>
             </form>
           </div>
        </div>
      )}

      {deletingRole && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]">
           <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
             <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <Trash2 className="w-8 h-8" />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Role?</h3>
             <p className="text-sm font-medium text-slate-500 mb-6">Are you sure you want to delete the <strong className="text-slate-800">{deletingRole.role_name}</strong> role? This action cannot be undone.</p>
             <div className="flex gap-3">
               <button onClick={() => setDeletingRole(null)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Cancel</button>
               <button onClick={handleDeleteRole} className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 text-white font-bold rounded-xl transition-colors">Confirm Delete</button>
             </div>
           </div>
        </div>
      )}
      
      {/* Same User Modals (Lock, Edit user perms) */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 border flex items-center gap-2 border-transparent">
                <Edit2 className="w-4 h-4 text-blue-600" />
                Assign Roles ({editingUser.name})
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:bg-slate-200 p-1 rounded-md transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6">
              <div className="mb-6 max-h-[50vh] overflow-y-auto pr-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Roles Configuration (Multi-Select)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roles.map(r => {
                     const isSelected = editingUser.roles?.includes(r.role_code);
                     return (
                       <div 
                         key={r.id} 
                         onClick={() => handleUserRoleToggle(r.role_code)}
                         className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-300'}`}
                       >
                         <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                         </div>
                         <div>
                            <span className={`block text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{r.role_name}</span>
                            <span className="block text-[10px] font-mono text-slate-500 mt-0.5">{r.role_code}</span>
                         </div>
                       </div>
                     )
                  })}
                </div>
              </div>
              <div className="mb-6 border-t border-slate-100 pt-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Account Status</label>
                <select value={editingUser.status} onChange={(e) => setEditingUser({...editingUser, status: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Active">Active / Unrestricted</option>
                  <option value="Suspended">Suspended / Deactivated</option>
                </select>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-xl transition-all">Deploy Access Policy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmLockUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl p-6 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmLockUser.locked ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {confirmLockUser.locked ? <Shield className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmLockUser.locked ? 'Unlock User?' : 'Lock User Access?'}</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">Are you sure you want to {confirmLockUser.locked ? 'restore access for' : 'revoke access from'} <strong className="text-slate-800 block mt-1">{confirmLockUser.name}</strong></p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmLockUser(null)} className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={() => toggleLock(confirmLockUser)} className={`flex-1 px-4 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-colors ${confirmLockUser.locked ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
