import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  ClipboardCheck, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Layout from '../components/Layout';
import { useAuthStore } from '../store/auth';
import SecurityDashboardComponent from '../components/SecurityDashboard';
import SecurityHodDashboard from '../components/SecurityHodDashboard';

import CorporateDashboard from '../components/CorporateDashboard';

const data = [
  { name: '08:00', visitors: 12, passes: 45 },
  { name: '10:00', visitors: 34, passes: 67 },
  { name: '12:00', visitors: 56, passes: 89 },
  { name: '14:00', visitors: 44, passes: 76 },
  { name: '16:00', visitors: 67, passes: 54 },
  { name: '18:00', visitors: 32, passes: 43 },
  { name: '20:00', visitors: 15, passes: 21 },
];

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    activePasses: 42,
    currentVisitors: 18,
    violations: 0,
    lateReturns: 3
  });

  if (user?.role === 'SECURITY_GUARD' || user?.role === 'SECURITY_SUPERVISOR') {
    return (
      <Layout>
        <SecurityDashboardComponent />
      </Layout>
    );
  }

  if (user?.role === 'SECURITY_HOD') {
    return (
      <Layout>
        <SecurityHodDashboard />
      </Layout>
    );
  }

  if (user?.role === 'SUPER_ADMIN') {
    return (
      <Layout>
        <CorporateDashboard />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.0 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Staff Exits</p>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">{stats.activePasses}</h3>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
              <span className="text-emerald-500 font-bold">+5%</span> from last hour
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Visitors</p>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">{stats.currentVisitors}</h3>
            <div className="mt-2 text-[10px] text-slate-500">Inpatient Depts (12) / Vendors (6)</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Zone Violations</p>
            <h3 className="text-2xl font-bold tracking-tight text-rose-600">{stats.violations}</h3>
            <div className="mt-2 text-[10px] text-slate-500">Last: OT Complex (14:32)</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Late Returns</p>
            <h3 className="text-2xl font-bold tracking-tight text-amber-500">{stats.lateReturns >= 10 ? stats.lateReturns : `0${stats.lateReturns}`}</h3>
            <div className="mt-2 text-[10px] text-slate-500">Escalation pending (HOD)</div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[480px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl flex items-center justify-between">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">Traffic Analysis</h2>
              <div className="flex gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider">Passes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider">Visitors</span>
                </div>
              </div>
            </div>
            <div className="flex-1 p-6 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPasses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: '600' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: '600' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    labelStyle={{ fontWeight: '600', marginBottom: '4px', color: '#1e293b' }}
                    itemStyle={{ fontSize: '12px', fontWeight: '500' }}
                  />
                  <Area type="monotone" dataKey="passes" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorPasses)" />
                  <Area type="monotone" dataKey="visitors" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm h-[480px]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">Recent Logs</h2>
              <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 relative z-10 cursor-pointer">Filter</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
              {[
                { user: 'Dr. Jane Doe', action: 'Left premises (Short Leave)', time: '10:45 AM', type: 'exit' },
                { user: 'Robert Vance', action: 'Entered premises (Vendor)', time: '11:15 AM', type: 'entry' },
                { user: 'Sarah Kincaid', action: 'Pass overdue (1h limit)', time: '12:00 PM', type: 'alert' },
                { user: 'Mark Anthony', action: 'Completed night duty', time: '12:30 PM', type: 'completed' },
                { user: 'Emergency Ward', action: 'Access lockdown triggered', time: '1:00 PM', type: 'alert' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    item.type === 'alert' ? 'bg-rose-500' : 
                    item.type === 'entry' ? 'bg-emerald-500' : 
                    item.type === 'completed' ? 'bg-blue-500' : 'bg-slate-400'
                  }`}></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 leading-tight mb-1">{item.user}</p>
                    <p className="text-xs text-slate-500">{item.action}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
