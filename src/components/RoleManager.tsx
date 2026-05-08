import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Plus, Edit2, Trash2, CheckSquare, Square, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Role {
  id: number;
  role_name: string;
  role_code: string;
}

interface Permission {
  id: number;
  permission_key: string;
  module_name: string;
  description: string;
}

const RoleManager = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<number[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editRole, setEditRole] = useState<{role_name: string, role_code: string}>({ role_name: '', role_code: '' });
  
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [rolesRes, permRes] = await Promise.all([
        axios.get('/api/roles', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        axios.get('/api/permissions', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      setRoles(rolesRes.data);
      setPermissions(permRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectRole = async (role: Role) => {
    setSelectedRole(role);
    setIsEditing(false);
    try {
      const res = await axios.get(`/api/roles/${role.id}/permissions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRolePermissions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRole = async () => {
    try {
      if (selectedRole) {
        await axios.put(`/api/roles/${selectedRole.id}`, editRole, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/roles', editRole, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      setIsEditing(false);
      fetchData();
    } catch (err) {
      alert('Error saving role');
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!window.confirm('Delete role?')) return;
    try {
      await axios.delete(`/api/roles/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSelectedRole(null);
      fetchData();
    } catch (err) {
      alert('Error deleting role');
    }
  };

  const togglePermission = async (permId: number) => {
    if (!selectedRole) return;
    const newPerms = rolePermissions.includes(permId) 
      ? rolePermissions.filter(id => id !== permId)
      : [...rolePermissions, permId];
      
    // Optimistic update
    setRolePermissions(newPerms);

    try {
      await axios.post(`/api/roles/${selectedRole.id}/permissions`, { permission_ids: newPerms }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (err) {
      alert('Error updating permissions');
      // Revert optimistic update
      selectRole(selectedRole); 
    }
  };

  const startEdit = (role?: Role) => {
    if (role) {
      setSelectedRole(role);
      setEditRole({ role_name: role.role_name, role_code: role.role_code });
    } else {
      setSelectedRole(null);
      setEditRole({ role_name: '', role_code: '' });
    }
    setIsEditing(true);
  };

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module_name]) acc[perm.module_name] = [];
    acc[perm.module_name].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Roles...</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Roles & Permissions</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Roles List */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Roles</h2>
             <button onClick={() => startEdit()} className="text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-colors">
               <Plus className="w-5 h-5" />
             </button>
          </div>
          <div className="space-y-2">
            {roles.map(role => (
              <div 
                key={role.id} 
                className={`p-3 rounded-2xl cursor-pointer transition-all flex justify-between items-center group
                  ${selectedRole?.id === role.id && !isEditing ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-700 bg-white border border-slate-100'}
                `}
                onClick={() => selectRole(role)}
              >
                <div>
                  <p className="font-bold text-sm">{role.role_name}</p>
                  <p className={`text-[10px] uppercase tracking-widest ${selectedRole?.id === role.id && !isEditing ? 'text-blue-200' : 'text-slate-400'}`}>{role.role_code}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={(e) => { e.stopPropagation(); startEdit(role); }}
                     className={`p-1.5 rounded-lg ${selectedRole?.id === role.id && !isEditing ? 'text-white hover:bg-blue-500' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                   >
                     <Edit2 className="w-4 h-4" />
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}
                     className={`p-1.5 rounded-lg ${selectedRole?.id === role.id && !isEditing ? 'text-white hover:bg-rose-500' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Details Panel */}
        <div className="col-span-1 md:col-span-3">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div 
                key="edit"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm"
              >
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-lg font-bold">{selectedRole ? 'Edit Role' : 'Create New Role'}</h2>
                   <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-900"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4 max-w-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Role Name</label>
                    <input 
                      className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-500 outline-none"
                      value={editRole.role_name} onChange={e => setEditRole({...editRole, role_name: e.target.value})} placeholder="e.g. Front Desk Officer" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Role Code</label>
                    <input 
                      className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-500 outline-none font-mono text-sm"
                      value={editRole.role_code} onChange={e => setEditRole({...editRole, role_code: e.target.value.toUpperCase()})} placeholder="e.g. FRONT_DESK" 
                    />
                  </div>
                  <button onClick={handleSaveRole} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Role
                  </button>
                </div>
              </motion.div>
            ) : selectedRole ? (
              <motion.div 
                key="view"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm"
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-black">{selectedRole.role_name}</h2>
                  <p className="text-xs font-mono text-slate-500 uppercase mt-1">CODE: {selectedRole.role_code}</p>
                </div>

                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Assigned Permissions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <div key={module} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 px-2">{module}</h4>
                      <div className="space-y-1">
                        {perms.map(perm => {
                          const isAssigned = rolePermissions.includes(perm.id);
                          return (
                            <div 
                              key={perm.id} 
                              onClick={() => togglePermission(perm.id)}
                              className="flex items-start gap-3 p-2 rounded-xl hover:bg-white cursor-pointer transition-colors"
                            >
                              <div className={`mt-0.5 ${isAssigned ? 'text-blue-600' : 'text-slate-300'}`}>
                                {isAssigned ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className={`text-sm font-bold ${isAssigned ? 'text-slate-900' : 'text-slate-600'}`}>{perm.permission_key}</p>
                                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{perm.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
               <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                 <Shield className="w-12 h-12 mb-4 opacity-20" />
                 <p className="font-medium">Select a role to view permissions</p>
               </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default RoleManager;
