import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Save, CheckCircle, XCircle } from 'lucide-react';

const PermissionMatrix: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<Record<string, number[]>>({}); // roleId -> permissionIds[]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rRes, pRes, mRes] = await Promise.all([
          axios.get('/api/roles'),
          axios.get('/api/permissions'),
          axios.get('/api/permissions/matrix')
        ]);
        setRoles(rRes.data);
        setPermissions(pRes.data);
        setMatrix(mRes.data);
      } catch (e) {
        console.error('Failed to fetch matrix data', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const togglePermission = (roleId: number, permId: number) => {
    setMatrix(prev => {
      const current = prev[roleId] || [];
      if (current.includes(permId)) {
        return { ...prev, [roleId]: current.filter(id => id !== permId) };
      } else {
        return { ...prev, [roleId]: [...current, permId] };
      }
    });
  };

  const handleSave = async () => {
    try {
      await axios.post('/api/permissions/matrix', { matrix });
      alert('Permission Matrix updated successfully!');
    } catch (e) {
      alert('Failed to save changes.');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Permission Grid...</div>;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Governance Permission Matrix
          </h2>
          <p className="text-sm text-slate-500">Enable or disable specific system features per user role.</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-sm"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3 border-b border-slate-200 min-w-[200px]">System Module / Permission</th>
              {roles.map(role => (
                <th key={role.id} className="px-4 py-3 border-b border-slate-200 text-center whitespace-nowrap">
                  {role.role_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700">
            {permissions.map(perm => (
              <tr key={perm.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 border-b border-slate-200">
                  <div className="font-bold text-slate-800">{perm.permission_key}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">{perm.description}</div>
                </td>
                {roles.map(role => {
                   const isActive = (matrix[role.id] || []).includes(perm.id);
                   return (
                     <td key={`${role.id}-${perm.id}`} className="px-4 py-4 border-b border-slate-200 text-center">
                        <button 
                          onClick={() => togglePermission(role.id, perm.id)}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                            isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'
                          } hover:brightness-95`}
                        >
                          {isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </button>
                     </td>
                   );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PermissionMatrix;
