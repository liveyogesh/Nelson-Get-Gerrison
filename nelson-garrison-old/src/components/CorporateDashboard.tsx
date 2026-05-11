import React from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  Map, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  Hospital,
  ShieldCheck,
  Users
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const facilityData = [
  { name: 'Nelson Main (HQ)', visitors: 450, gatepasses: 120, incidents: 3 },
  { name: 'Cancer Institute', visitors: 120, gatepasses: 30, incidents: 0 },
  { name: 'Diagnostics Center', visitors: 300, gatepasses: 15, incidents: 1 },
];

const CorporateDashboard: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Corporate Command Center</h1>
          <p className="text-sm text-slate-500">Enterprise Multi-Facility Overview</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-white border border-slate-300 text-sm rounded-lg px-3 py-2 text-slate-700 font-medium">
            <option>All Regions</option>
            <option>WEST Region</option>
          </select>
        </div>
      </div>

      {/* Corporate KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
           className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Facilities</p>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Building2 size={16} />
            </div>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">3</h3>
          <div className="mt-2 text-[10px] text-slate-500 font-semibold flex items-center gap-1">
            <span className="text-indigo-600">100%</span> Uptime Network
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
           className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enterprise Footfall</p>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Users size={16} />
            </div>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">870</h3>
          <div className="mt-2 text-[10px] text-slate-500 font-semibold flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-500" /> <span className="text-emerald-500">+12%</span> vs yesterday
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
           className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gatepasses Issued</p>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <ShieldCheck size={16} />
            </div>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">165</h3>
          <div className="mt-2 text-[10px] text-slate-500 font-semibold">
            Across 3 facilities
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
           className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cross-Facility Alerts</p>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <AlertTriangle size={16} />
            </div>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-amber-600">4</h3>
          <div className="mt-2 text-[10px] text-slate-500 font-semibold">
            Pending Corporate Escalations
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cross Facility Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-[400px] flex flex-col">
            <h2 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
              <Activity size={16} className="text-indigo-500" />
              Multi-Facility Volume Comparison
            </h2>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }}/>
                  <Bar dataKey="visitors" name="Visitors" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gatepasses" name="Gatepasses" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
        </div>

        {/* Global Security Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <Hospital size={16} className="text-rose-500" />
              Corporate Incidents
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Nelson Main</span>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">HQ01</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">Repeated Gate 3 unauthorized access attempts.</p>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Diagnostics Mumbai</span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">ND-01</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">Biometric offline at staff entrance.</p>
            </div>

             <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Inter-Facility</span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">SYSTEM</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">Deputation requested for 5 Nurses from Main to Cancer Inst.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CorporateDashboard;
