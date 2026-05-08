import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building2, 
  Activity, 
  AlertTriangle, 
  Map, 
  TrendingUp, 
  Users, 
  Globe, 
  ShieldCheck,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion } from 'motion/react';

interface EnterpriseStats {
  facilities: number;
  totalTraffic: number;
  activeIncidents: number;
}

interface FacilityActivity {
  facility_name: string;
  traffic_count: number;
}

interface Device {
  device_id: number;
  facility_name: string;
  gate_name: string;
  device_name: string;
  device_type: string;
  status: string;
}

const CorporateDashboard: React.FC = () => {
    const [stats, setStats] = useState<EnterpriseStats | null>(null);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [facilityActivity, setFacilityActivity] = useState<FacilityActivity[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEnterpriseData = async () => {
            try {
                const [dashRes, deviceRes] = await Promise.all([
                    axios.get('/api/enterprise/dashboard/summary', {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    }),
                    axios.get('/api/enterprise/devices/status', {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    })
                ]);
                setStats(dashRes.data.stats);
                setIncidents(dashRes.data.incidents);
                setFacilityActivity(dashRes.data.facilityActivity);
                setDevices(deviceRes.data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch enterprise data', err);
            }
        };
        fetchEnterpriseData();
    }, []);

    const COLORS = ['#ef4444', '#f59e0b', '#3b82f6'];

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
            <div className="text-center">
                <Activity className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.3em]">Synching Enterprise Node...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans">
            {/* Enterprise Header */}
            <header className="flex justify-between items-end mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-500/30">
                            <Globe className="w-6 h-6 text-blue-400" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-white uppercase">Enterprise Control</h1>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Global Governance & Operational Oversight</p>
                </div>

                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">System Status</p>
                        <p className="text-xs font-bold text-emerald-500 flex items-center gap-1 justify-end">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            ALL NODES OPERATIONAL
                        </p>
                    </div>
                </div>
            </header>

            {/* Global metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                  { label: 'Facilities Active', value: stats?.facilities, icon: Building2, color: 'text-blue-500' },
                  { label: 'Total Movements', value: stats?.totalTraffic.toLocaleString(), icon: TrendingUp, color: 'text-emerald-500' },
                  { label: 'Security Incidents', value: stats?.activeIncidents, icon: AlertTriangle, color: 'text-rose-500' },
                  { label: 'System Compliance', value: '98.4%', icon: ShieldCheck, color: 'text-amber-500' }
                ].map((m, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl"
                  >
                    <m.icon className={`w-5 h-5 ${m.color} mb-4`} />
                    <p className="text-4xl font-black text-white mb-1 tracking-tight">{m.value}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{m.label}</p>
                  </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Traffic Heatmap by Facility */}
                <div className="lg:col-span-8 bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8">
                   <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-tight">Facility Traffic Distribution</h3>
                            <p className="text-xs text-slate-500 font-medium">Real-time movement load across hospital network</p>
                        </div>
                        <div className="flex gap-2">
                             <button className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all">
                                <Search className="w-4 h-4 text-slate-400" />
                             </button>
                             <button className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all">
                                <Filter className="w-4 h-4 text-slate-400" />
                             </button>
                        </div>
                   </div>
                   <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={facilityActivity}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis 
                                    dataKey="facility_name" 
                                    stroke="#64748b" 
                                    fontSize={10} 
                                    fontWeight="bold"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis 
                                    stroke="#64748b" 
                                    fontSize={10} 
                                    fontWeight="bold"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    cursor={{fill: '#1e293b'}}
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                                />
                                <Bar dataKey="traffic_count" radius={[8, 8, 0, 0]}>
                                    {facilityActivity.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                   </div>
                </div>

                {/* Incident Severity Distribution */}
                <div className="lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8">
                    <h3 className="text-lg font-bold text-white tracking-tight mb-8">Network Vulnerability</h3>
                    <div className="h-[250px] mb-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={incidents}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                >
                                    {incidents.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-4">
                        {incidents.map((inc, i) => (
                            <div key={i} className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-slate-800/50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${inc.severity === 'HIGH' ? 'bg-rose-500' : inc.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">{inc.severity} Severity</span>
                                </div>
                                <span className="text-sm font-bold text-white">{inc.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Facility Switcher / Status */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-white tracking-tight">Facility Status Registry</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {facilityActivity.map((fac, i) => (
                            <div key={i} className="bg-black/20 p-6 rounded-3xl border border-slate-800 group hover:border-blue-500/30 transition-all cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <Building2 className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                                    <div className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20">ONLINE</div>
                                </div>
                                <h4 className="text-sm font-bold text-white mb-1">{fac.facility_name}</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Recent Load: {fac.traffic_count} Checks</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8">
                    <h3 className="text-lg font-bold text-white tracking-tight mb-8">Secure Edge Devices</h3>
                    <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        {devices.map((device, i) => (
                            <div key={i} className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-slate-800/50">
                                <div>
                                    <p className="text-xs font-bold text-white">{device.device_name}</p>
                                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">{device.facility_name} — {device.gate_name || 'Generic'}</p>
                                </div>
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${
                                    device.status === 'ONLINE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                } text-[8px] font-black`}>
                                    <div className={`w-1 h-1 rounded-full ${device.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    {device.status}
                                </div>
                            </div>
                        ))}
                        {devices.length === 0 && (
                             <p className="text-center text-slate-600 text-[10px] font-bold py-10 uppercase tracking-widest">No devices provisioned</p>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(100, 100, 100, 0.2);
                  border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default CorporateDashboard;
