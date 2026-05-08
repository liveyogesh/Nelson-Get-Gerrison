import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Plus, User, Calendar, Shield } from 'lucide-react';
import { motion } from 'motion/react';

interface Override {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  supervisor_id: number;
  sup_first: string;
  sup_last: string;
  reason: string;
  extended_until: string;
  created_at: string;
}

interface AppUser {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
}

const ShiftOverridesManager = () => {
    const [overrides, setOverrides] = useState<Override[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form
    const [isAdding, setIsAdding] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [reason, setReason] = useState('');
    const [extendedUntil, setExtendedUntil] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ovRes, uRes] = await Promise.all([
                axios.get('/api/admin/shift/override', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
                axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            ]);
            setOverrides(ovRes.data);
            setUsers(uRes.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/shift/override', {
                userId: selectedUser,
                reason,
                extendedUntil
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setIsAdding(false);
            setSelectedUser('');
            setReason('');
            setExtendedUntil('');
            fetchData();
        } catch (err) {
            alert('Failed to grant shift override');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Shift Overrides...</div>;

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-blue-600" />
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Shift Overrides</h1>
                </div>
                <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700">
                    <Plus className="w-4 h-4" /> New Override
                </button>
            </div>

            {isAdding && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8 max-w-2xl">
                    <h2 className="text-lg font-bold mb-4">Grant Shift Override</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Employee</label>
                                <select 
                                    required 
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-500 outline-none block"
                                    value={selectedUser} 
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                >
                                    <option value="">Select Employee...</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.employee_id})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Extend Until</label>
                                <input 
                                    type="datetime-local" 
                                    required 
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-500 outline-none block"
                                    value={extendedUntil} 
                                    onChange={(e) => setExtendedUntil(e.target.value)} 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reason for Override</label>
                            <input 
                                type="text" 
                                required 
                                className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-blue-500 outline-none block"
                                placeholder="E.g. Emergency surgery, overtime coverage"
                                value={reason} 
                                onChange={(e) => setReason(e.target.value)} 
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">Grant Override</button>
                            <button type="button" onClick={() => setIsAdding(false)} className="bg-slate-100 text-slate-700 px-6 py-2 rounded-xl font-bold">Cancel</button>
                        </div>
                    </form>
                </motion.div>
            )}

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-100/50">
                        <tr>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Employee</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Extended Until</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Reason</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Granted By</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Granted On</th>
                        </tr>
                    </thead>
                    <tbody>
                        {overrides.map(ov => (
                            <tr key={ov.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><User className="w-4 h-4" /></div>
                                        <div>
                                            <p className="font-bold text-slate-900">{ov.first_name} {ov.last_name}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">ID: {ov.employee_id}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-sm text-slate-900 font-bold flex items-center gap-2 pt-5">
                                    <Calendar className="w-4 h-4 text-amber-500" />
                                    {new Date(ov.extended_until).toLocaleString()}
                                </td>
                                <td className="p-4 text-sm text-slate-600">{ov.reason}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <Shield className="w-4 h-4 text-emerald-600" />
                                        {ov.sup_first} {ov.sup_last}
                                    </div>
                                </td>
                                <td className="p-4 text-xs text-slate-500 font-mono">{new Date(ov.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                        {overrides.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No shift overrides found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ShiftOverridesManager;
