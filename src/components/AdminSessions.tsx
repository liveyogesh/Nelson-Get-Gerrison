import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Monitor, Phone, MapPin, Search, ShieldAlert, LogOut } from 'lucide-react';

export default function AdminSessions() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/hrms/sessions');
            setSessions(data || []);
        } catch (e: any) {
            console.error(e);
        }
        setLoading(false);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchSessions(); }, []);

    const handleRevoke = async (sessionId: string) => {
        if (!confirm('Are you sure you want to forcibly terminate this active session?')) return;
        try {
            await axios.post(`/api/hrms/sessions/${sessionId}/revoke`);
            fetchSessions();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to revoke session');
        }
    };

    const filtered = sessions.filter(s => 
        (s.username || '').toLowerCase().includes(search.toLowerCase()) || 
        (s.ip_address || '').includes(search)
    );

    return (
        <div className="p-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Active Sessions</h3>
                    <p className="text-sm text-slate-500 font-medium tracking-tight mt-1">Monitor and govern concurrent user access sessions</p>
                </div>
                <div className="relative w-full xl:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search by username or IP..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#003366] outline-none shadow-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="py-12 text-center text-slate-400">Loading active sessions...</div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center text-slate-400 italic">No active sessions found.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(s => (
                        <div key={s.session_id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative">
                            <div className="absolute top-4 right-4">
                                <button
                                    onClick={() => handleRevoke(s.session_id)}
                                    title="Revoke Session & Force Logout"
                                    className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                            <h4 className="font-bold text-slate-800">{s.username}</h4>
                            <p className="text-xs text-slate-500 mb-4">{s.email}</p>
                            
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Monitor className="w-4 h-4 text-slate-400" />
                                    <span className="truncate">{s.user_agent || 'Unknown Device'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600 border-t border-slate-50 pt-2">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    <span>{s.ip_address || 'Unknown IP'}</span>
                                </div>
                                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider pt-2 border-t border-slate-50">
                                    Last Active: {new Date(s.last_activity_at || s.created_at).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
