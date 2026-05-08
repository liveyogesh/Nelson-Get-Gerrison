import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Shield, AlertCircle, Lock, UserCheck, Activity, Terminal, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SecurityCommandCenter = () => {
    const { token, user } = useAuthStore();
    const [stats, setStats] = useState({ traffic: 245, incidents: 3, pendingZones: 0 });
    const [pendingRequests, setPendingRequests] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [gates, setGates] = useState([]);
    const [traffic, setTraffic] = useState([]);
    const [guards, setGuards] = useState([]);
    const [showIncidentForm, setShowIncidentForm] = useState(false);
    const [formData, setFormData] = useState({ type: '', severity: 'LOW', person: '', person_id: '', location: '', status: 'OPEN', notes: '' });
    const [users, setUsers] = useState([]);

    const fetchData = async () => {
        try {
            const [pendingRes, incidentRes, gateRes, trafficRes, guardRes, usersRes] = await Promise.all([
                axios.get('/api/security/restricted/pending', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/security/incidents', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/security/gates', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/security/gates/traffic/recent', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/security/guards/active', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
            ]);
            setPendingRequests(pendingRes.data);
            setIncidents(incidentRes.data);
            setGates(gateRes.data);
            setTraffic(trafficRes.data);
            setGuards(guardRes.data);
            setUsers(usersRes.data);
            setStats(prev => ({ 
                ...prev, 
                traffic: trafficRes.data.length,
                pendingZones: pendingRes.data.length, 
                incidents: incidentRes.data.filter((i: any) => i.status === 'OPEN').length 
            }));
        } catch (err) {
            console.error('Error fetching security data');
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleApprove = async (requestId: number) => {
        try {
            await axios.post('/api/security/restricted/approve', { requestId }, { headers: { Authorization: `Bearer ${token}` } });
            fetchData();
        } catch (err) { alert('Approval failed'); }
    };

    const handleLogIncident = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/security/incidents', {
                incidentType: formData.type,
                severity: formData.severity,
                involvedPerson: formData.person || undefined,
                involved_person_id: formData.person_id || undefined,
                location: formData.location || undefined,
                incident_status: formData.status,
                description: formData.notes
            }, { headers: { Authorization: `Bearer ${token}` } });
            setShowIncidentForm(false);
            setFormData({ type: '', severity: 'LOW', person: '', person_id: '', location: '', status: 'OPEN', notes: '' });
            fetchData();
        } catch (err) { alert('Failed to log incident'); }
    };

    const handleOverride = async () => {
        if (user?.username !== 'SECHOD01') return;
        const employeeId = prompt('Enter Employee ID for force check-in:');
        const reason = prompt('Reason for override:');
        if (!employeeId || !reason) return;

        try {
            await axios.post('/api/security/override/force-checkin', { employeeId, reason }, { headers: { Authorization: `Bearer ${token}` } });
            alert('Override successful and audited.');
        } catch (err) { alert('Override failed'); }
    };

    const handleLockdown = async (gateId: number, currentStatus: string) => {
        const status = currentStatus === 'LOCKDOWN' ? 'ACTIVE' : 'LOCKDOWN';
        const reason = prompt(`Reason for ${status}:`);
        if (!reason) return;

        try {
            await axios.post('/api/security/gates/lockdown', { gateId, status, reason }, { headers: { Authorization: `Bearer ${token}` } });
            fetchData();
        } catch (err) { alert('Lockdown operation failed'); }
    };

    const handleShiftExtension = async () => {
        const userId = prompt('Enter User ID to extend shift:');
        const reason = prompt('Reason for extension:');
        const minutes = prompt('Minutes to extend:');
        if (!userId || !reason || !minutes) return;

        const extendedUntil = new Date(Date.now() + parseInt(minutes) * 60000).toISOString().slice(0, 19).replace('T', ' ');

        try {
            await axios.post('/api/shift/override', { userId, reason, extendedUntil }, { headers: { Authorization: `Bearer ${token}` } });
            alert('Shift extension granted.');
        } catch (err) { alert('Extension failed'); }
    };

    return (
        <div className="p-8 bg-[#0f172a] min-h-screen text-slate-200 font-sans">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Shield className="text-blue-500 w-8 h-8" />
                        Security Operations Command Center
                    </h1>
                    <p className="text-slate-400 mt-1 uppercase text-xs tracking-widest font-semibold flex items-center gap-2">
                        <Activity className="w-3 h-3 text-green-500 animate-pulse" />
                        Live Operational Stream — Level 5 Authorization
                    </p>
                </div>
                <div className="flex gap-4">
                    {(user?.role === 'SECHOD' || user?.role === 'SUPER_ADMIN') && (
                        <button 
                            onClick={handleShiftExtension}
                            className="bg-purple-900/30 border border-purple-500/50 text-purple-500 px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-500 hover:text-white transition-all flex items-center gap-2"
                        >
                            <Clock className="w-4 h-4" />
                            SHIFT EXTENSION
                        </button>
                    )}
                    {user?.username === 'SECHOD01' && (
                        <button 
                            onClick={handleOverride}
                            className="bg-red-900/30 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                        >
                            <Terminal className="w-4 h-4" />
                            ROOT OVERRIDE
                        </button>
                    )}
                    <button 
                        onClick={() => setShowIncidentForm(true)}
                        className="bg-blue-600 px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-all flex items-center gap-2"
                    >
                        <AlertCircle className="w-4 h-4" />
                        LOG INCIDENT
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'GATE TRAFFIC (24H)', value: stats.traffic, icon: UserCheck, color: 'text-emerald-500' },
                    { label: 'ACTIVE INCIDENTS', value: stats.incidents, icon: AlertCircle, color: 'text-amber-500' },
                    { label: 'ZONE APPROVALS', value: stats.pendingZones, icon: Lock, color: 'text-blue-500' },
                    { label: 'SYSTEM STATUS', value: 'OPTIMAL', icon: Activity, color: 'text-indigo-500' }
                ].map((s, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-slate-500 tracking-tighter uppercase">{s.label}</span>
                            <s.icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <div className="text-3xl font-black text-white tracking-tight">{s.value}</div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pending Zone Approvals */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            <Lock className="w-4 h-4 text-blue-400" />
                            Restricted Zone Requests
                        </h2>
                    </div>
                    <div className="p-4 space-y-4">
                        {pendingRequests.length === 0 ? (
                            <p className="text-slate-500 text-center py-8 text-sm italic">No pending authorizations.</p>
                        ) : (
                            pendingRequests.map((req: any) => (
                                <div key={req.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-white text-sm">{req.username}</div>
                                        <div className="text-[10px] text-blue-400 font-medium">Zone: {req.zone_name}</div>
                                    </div>
                                    <button 
                                        onClick={() => handleApprove(req.id)}
                                        className="bg-white text-black px-2 py-1 rounded text-[10px] font-black hover:bg-blue-400"
                                    >
                                        APPROVE
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Gate Lockdown Control */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-slate-800 border-b border-slate-700">
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            <Shield className="w-4 h-4 text-red-500" />
                            Gate Lockdown Controls
                        </h2>
                    </div>
                    <div className="p-4 space-y-3">
                        {gates.map((gate: any) => (
                            <div key={gate.gate_id} className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-xs text-white uppercase">{gate.gate_name}</div>
                                    <div className={`text-[9px] font-bold ${gate.status === 'LOCKDOWN' ? 'text-red-500' : 'text-green-500'}`}>
                                        STATUS: {gate.status}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleLockdown(gate.gate_id, gate.status)}
                                    className={`px-3 py-1 rounded text-[10px] font-bold ${
                                        gate.status === 'LOCKDOWN' ? 'bg-green-600 text-white' : 'bg-red-600/20 text-red-500 border border-red-500/30'
                                    }`}
                                >
                                    {gate.status === 'LOCKDOWN' ? 'RELEASE' : 'LOCKDOWN'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Live Traffic */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            <Activity className="w-4 h-4 text-green-400" />
                            Live Gate Traffic
                        </h2>
                        <span className="text-[10px] text-slate-500 animate-pulse font-mono">STREAM ACTIVE</span>
                    </div>
                    <div className="p-4 max-h-[300px] overflow-y-auto space-y-2">
                        {traffic.map((t: any) => (
                            <div key={t.id} className="flex justify-between items-center text-[10px] bg-black/20 p-2 rounded border border-slate-800">
                                <span className={t.movement_type === 'IN' ? 'text-green-400' : 'text-amber-400'}>
                                    [{t.movement_type}]
                                </span>
                                <span className="text-slate-300 font-bold">{t.gate_name}</span>
                                <span className="text-slate-600 font-mono text-[9px]">
                                    {new Date(t.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Incidents */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-slate-800 border-b border-slate-700">
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            Security Incident Logs
                        </h2>
                    </div>
                    <div className="p-4">
                        <div className="space-y-3">
                            {incidents.slice(0, 5).map((incident: any) => (
                                <div key={incident.id} className="flex gap-4 p-3 rounded-xl hover:bg-slate-700/30 transition-colors border border-transparent hover:border-slate-600">
                                    <div className={`w-1 h-12 rounded-full ${
                                        incident.severity === 'HIGH' ? 'bg-red-500' : 
                                        incident.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'
                                    }`} />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-slate-200 text-sm">{incident.incident_type}</span>
                                            <span className="text-[10px] text-slate-500">{new Date(incident.created_at).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{incident.description}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[9px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-400">
                                                By: {incident.reported_by_name}
                                            </span>
                                            <span className={`text-[9px] font-bold ${
                                                incident.status === 'CLOSED' ? 'text-green-500' : 'text-amber-500'
                                            }`}>
                                                {incident.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Analytical Trends Placeholder */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden p-6">
                    <h2 className="text-sm font-bold flex items-center gap-2 mb-4">
                        <UserCheck className="w-4 h-4 text-indigo-400" />
                        Active Personnel
                    </h2>
                    <div className="space-y-3">
                        {guards.length === 0 ? (
                            <p className="text-slate-500 text-center text-xs">No active guards on duty records found.</p>
                        ) : (
                            guards.map((guard: any, i: number) => (
                                <div key={i} className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-xs font-bold text-white tracking-tight">{guard.first_name} {guard.last_name}</span>
                                    </div>
                                    <span className="text-[10px] bg-indigo-900/30 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                                        {guard.shift_name}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Incident Modal */}
            <AnimatePresence>
                {showIncidentForm && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-800 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="bg-slate-900 p-6 border-b border-slate-700 flex justify-between items-center">
                                <h3 className="text-xl font-bold flex items-center gap-3">
                                    <AlertCircle className="text-amber-500" />
                                    New Security Log
                                </h3>
                                <button onClick={() => setShowIncidentForm(false)} className="text-slate-500 hover:text-white">&times;</button>
                            </div>
                            <form onSubmit={handleLogIncident} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                        <input 
                                            required
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
                                            placeholder="Theft, Misconduct, Breach..."
                                            value={formData.type}
                                            onChange={e => setFormData({...formData, type: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Severity</label>
                                        <select 
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
                                            value={formData.severity}
                                            onChange={e => setFormData({...formData, severity: e.target.value})}
                                        >
                                            <option value="LOW">LOW</option>
                                            <option value="MEDIUM">MEDIUM</option>
                                            <option value="HIGH">HIGH</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Involved Internal Person</label>
                                        <select 
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
                                            value={formData.person_id}
                                            onChange={e => setFormData({...formData, person_id: e.target.value})}
                                        >
                                            <option value="">-- None / External --</option>
                                            {users.map((u: any) => (
                                                <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.employee_id})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">External Person / Desc</label>
                                        <input 
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
                                            placeholder="Name or Emp ID (If not in list)"
                                            value={formData.person}
                                            onChange={e => setFormData({...formData, person: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                                        <input 
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
                                            placeholder="Gate A, Server Room, etc."
                                            value={formData.location}
                                            onChange={e => setFormData({...formData, location: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                                        <select 
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
                                            value={formData.status}
                                            onChange={e => setFormData({...formData, status: e.target.value})}
                                        >
                                            <option value="OPEN">OPEN</option>
                                            <option value="INVESTIGATING">INVESTIGATING</option>
                                            <option value="CLOSED">CLOSED</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Detailed Description</label>
                                    <textarea 
                                        required
                                        rows={4}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 resize-none"
                                        placeholder="Describe the incident in detail..."
                                        value={formData.notes}
                                        onChange={e => setFormData({...formData, notes: e.target.value})}
                                    />
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setShowIncidentForm(false)}
                                        className="flex-1 bg-slate-700 text-slate-300 py-3 rounded-lg font-bold hover:bg-slate-600"
                                    >
                                        CANCEL
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20"
                                    >
                                        COMMIT TO LOG
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SecurityCommandCenter;
