import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function AdminDashboard() {
  const gatepassTimeData = [
    { name: 'Mon', avgTime: 15 },
    { name: 'Tue', avgTime: 12 },
    { name: 'Wed', avgTime: 18 },
    { name: 'Thu', avgTime: 22 },
    { name: 'Fri', avgTime: 14 },
    { name: 'Sat', avgTime: 8 },
    { name: 'Sun', avgTime: 10 },
  ];

  const visitorPeakData = [
    { time: '08:00', visitors: 10 },
    { time: '10:00', visitors: 45 },
    { time: '12:00', visitors: 80 },
    { time: '14:00', visitors: 55 },
    { time: '16:00', visitors: 40 },
    { time: '18:00', visitors: 65 },
    { time: '20:00', visitors: 15 },
  ];

  const securityTrendData = [
    { month: 'Jan', incidents: 4 },
    { month: 'Feb', incidents: 3 },
    { month: 'Mar', incidents: 7 },
    { month: 'Apr', incidents: 2 },
    { month: 'May', incidents: 1 },
    { month: 'Jun', incidents: 5 },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-800">Analytics Dashboard</h3>
        <p className="text-sm text-slate-500 font-medium">Gain insights into hospital security and operational efficiency</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gatepass Approval Times */}
        <div className="bg-white border text-center border-slate-200 rounded-xl p-6 shadow-sm">
          <h4 className="font-bold text-slate-700 mb-6 text-left">Average Gatepass Approval Time (mins)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={gatepassTimeData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="avgTime" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Visitor Peak Hours */}
        <div className="bg-white border text-center border-slate-200 rounded-xl p-6 shadow-sm">
          <h4 className="font-bold text-slate-700 mb-6 text-left">Visitor Volume by Time of Day</h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={visitorPeakData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="visitors" stroke="#10b981" fillOpacity={0.2} fill="#10b981" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Security Incident Trends */}
        <div className="bg-white border text-center border-slate-200 rounded-xl p-6 shadow-sm lg:col-span-2">
          <h4 className="font-bold text-slate-700 mb-6 text-left">Security Incidents Trend (6 Months)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={securityTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="incidents" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
