import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Search, Filter, Calendar } from 'lucide-react';

interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  email: string;
  action: string;
  module: string;
  resource_id: string;
  ip_address: string;
  created_at: string;
  old_values: any;
  new_values: any;
}

const AuditLogs = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [action, setAction] = useState('');
    const [module, setModule] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (action) params.append('action', action);
            if (module) params.append('module', module);
            if (startDate) params.append('startDate', startDate + 'T00:00:00');
            if (endDate) params.append('endDate', endDate + 'T23:59:59');
            
            const res = await axios.get(`/api/audit?${params.toString()}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setLogs(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch audit logs', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    if (loading && logs.length === 0) return <div className="p-8 text-center text-slate-500">Loading Audit Logs...</div>;

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <h1 className="text-2xl font-black mb-6 flex items-center gap-2 text-slate-900">
                <Activity className="text-blue-600" />
                System Audit Logs
            </h1>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-end">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Action</label>
                   <input value={action} onChange={e => setAction(e.target.value)} placeholder="e.g. LOGIN, UPDATE" className="border border-slate-200 px-3 py-2 rounded-lg text-sm w-40" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Module</label>
                   <input value={module} onChange={e => setModule(e.target.value)} placeholder="e.g. AUTH, GATEPASS" className="border border-slate-200 px-3 py-2 rounded-lg text-sm w-40" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                   <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-slate-200 px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                   <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-slate-200 px-3 py-2 rounded-lg text-sm" />
                </div>
                <button onClick={fetchLogs} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700">
                    <Search className="w-4 h-4" /> Filter
                </button>
            </div>
            
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-100/50">
                        <tr>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Timestamp</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">User</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Action / Module</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Resource IP</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                                <td className="p-4 font-mono text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                                <td className="p-4">
                                   <p className="font-bold text-slate-900">{log.username || 'System'}</p>
                                   <p className="text-[10px] text-slate-500">{log.email || 'N/A'}</p>
                                </td>
                                <td className="p-4">
                                   <span className="text-xs font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded mr-2">{log.action}</span>
                                   <span className="text-[10px] font-bold text-slate-500 uppercase">{log.module}</span>
                                </td>
                                <td className="p-4 font-mono text-xs text-slate-500">
                                    <p>{log.ip_address || 'N/A'}</p>
                                    <p className="text-[10px]">ID: {log.resource_id || '-'}</p>
                                </td>
                                <td className="p-4 text-[10px] text-slate-500 max-w-xs truncate" title={JSON.stringify({ old: log.old_values, new: log.new_values })}>
                                    {(log.new_values) ? JSON.stringify(log.new_values).substring(0, 50) + '...' : '-'}
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No logs found matching criteria.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogs;
