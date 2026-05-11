import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Users, 
  AlertTriangle, 
  AlertOctagon, 
  Moon, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  MapPin
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockActivityData = [
  { time: '18:00', gate1: 20, gate2: 15 },
  { time: '19:00', gate1: 25, gate2: 12 },
  { time: '20:00', gate1: 15, gate2: 8 },
  { time: '21:00', gate1: 10, gate2: 5 },
  { time: '22:00', gate1: 5, gate2: 2 },
  { time: '23:00', gate1: 2, gate2: 1 },
];

const SecurityHodDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Guards</p>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Users size={16} />
            </div>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">14 / 16</h3>
          <div className="mt-2 text-[10px] text-slate-500">
            Morning Shift (SHT-M) Active
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Zone Alerts</p>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <ShieldAlert size={16} />
            </div>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-rose-600">3</h3>
          <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
            <span className="text-rose-500 font-bold">+1</span> since last hour
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Emergency Req.</p>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Activity size={16} />
            </div>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-amber-600">2</h3>
          <div className="mt-2 text-[10px] text-slate-500">
            Require HOD Approval
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security Violations</p>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <AlertOctagon size={16} />
            </div>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">5</h3>
          <div className="mt-2 text-[10px] text-slate-500">
            In the last 24 hours
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[420px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl flex justify-between items-center">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <Activity size={16} className="text-indigo-500" />
              Live Gate Activity
            </h2>
            <div className="flex gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2 text-indigo-600"><div className="w-2 h-2 rounded-full bg-indigo-600"></div>Main Gate</div>
              <div className="flex items-center gap-2 text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-600"></div>Emergency Gate</div>
            </div>
          </div>
          <div className="flex-1 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockActivityData}>
                <defs>
                  <linearGradient id="gate1Color" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gate2Color" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="gate1" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#gate1Color)" />
                <Area type="monotone" dataKey="gate2" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gate2Color)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[420px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Urgent Escalations
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Emergency Override</span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">2m ago</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">Dr. Sharma requested late exit.</p>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 bg-amber-600 text-white text-xs font-bold py-1.5 rounded">Approve</button>
                <button className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs font-bold py-1.5 rounded">Deny</button>
              </div>
            </div>

            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Zone Breach</span>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">15m ago</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">Unauthorized access at OT Complex.</p>
              <div className="mt-3">
                <button className="w-full bg-white border border-rose-300 text-rose-700 text-xs font-bold py-1.5 rounded">View Incident Report</button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Shift Handover</span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">1h ago</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">Evening Shift reported 2 absentees.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports & Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
            <Moon size={16} className="text-slate-500" />
            Late-Night Movement Summary
          </h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Users size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Supplier Delivery (Oxygen)</p>
                    <p className="text-xs text-slate-500">Gate 3 • Auth: Night Supervisor</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-700 font-mono">02:{15 + i * 10} AM</span>
                </div>
              </div>
            ))}
            <button className="w-full mt-2 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
              View Full Night Report
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-slate-500" />
            Active Guards Deployment
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border border-slate-200 rounded-lg">
              <p className="text-xs font-bold text-slate-400 uppercase">Main Gate</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-bold text-slate-800">4 Guards</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <p className="text-xs font-bold text-slate-400 uppercase">Emergency</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-bold text-slate-800">2 Guards</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <p className="text-xs font-bold text-slate-400 uppercase">ICU Level</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-bold text-slate-800">2 Guards</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              </div>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <p className="text-xs font-bold text-slate-400 uppercase">Parking</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-bold text-slate-800">3 Guards</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityHodDashboard;
