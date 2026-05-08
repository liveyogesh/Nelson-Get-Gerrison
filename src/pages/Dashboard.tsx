import React from 'react';
import { useAuthStore } from '../store/authStore';

const Dashboard = () => {
  const { user } = useAuthStore();
  return (
    <div className="p-8 font-sans">
      <h1 className="text-3xl font-bold">Welcome, {user?.username}</h1>
      <p className="mt-2 text-gray-600 font-mono text-sm tracking-widest uppercase">Role: {user?.role}</p>
      
      <div className="mt-6 flex flex-wrap gap-2">
         <a href="/security-settings" className="text-slate-900 bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 font-bold flex items-center gap-2 w-fit text-sm">
            My Security Settings (2FA & Password) →
         </a>
      </div>

      {(user?.role === 'SECHOD' || user?.role === 'SUPER_ADMIN') && (
        <div className="mt-4 flex flex-col gap-2">
          <a href="/security/command-center" className="text-blue-600 hover:underline font-bold flex items-center gap-2">
            Go to Security Operations Command Center →
          </a>
          <a href="/terminal" className="text-gray-600 hover:underline font-bold flex items-center gap-2 text-sm">
            Access Security Terminal (Scanning Node) →
          </a>
        </div>
      )}

      {(user?.role === 'SUPER_ADMIN' || user?.role === 'CORPORATE_ADMIN') && (
        <div className="mt-4 flex flex-col gap-2">
          <a href="/corporate" className="text-blue-900 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 font-bold flex items-center gap-2 w-fit text-sm">
            Access Enterprise Control Dashboard (Global Oversight) →
          </a>
          {user?.role === 'SUPER_ADMIN' && (
            <>
              <a href="/admin/settings" className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 font-bold flex items-center gap-2 w-fit text-sm">
                Manage System Configuration →
              </a>
              <a href="/admin/roles" className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 font-bold flex items-center gap-2 w-fit text-sm">
                Roles & Permissions Matrix →
              </a>
              <a href="/admin/facilities" className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 font-bold flex items-center gap-2 w-fit text-sm">
                Global Facility Network →
              </a>
              <a href="/admin/audit" className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 font-bold flex items-center gap-2 w-fit text-sm">
                Audit Logs →
              </a>
            </>
          )}
        </div>
      )}

      {['SUPER_ADMIN', 'CORPORATE_ADMIN', 'FACILITY_ADMIN', 'SECHOD', 'HOD'].includes(user?.role || '') && (
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/approvals" className="text-emerald-900 bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100 font-bold flex items-center gap-2 w-fit text-sm">
            Pending Gatepass Approvals →
          </a>
          <a href="/scanner" className="text-purple-900 bg-purple-50 px-4 py-2 rounded-lg hover:bg-purple-100 font-bold flex items-center gap-2 w-fit text-sm">
            Gatepass QR Scanner App →
          </a>
          <a href="/hr/shift-overrides" className="text-amber-900 bg-amber-50 px-4 py-2 rounded-lg hover:bg-amber-100 font-bold flex items-center gap-2 w-fit text-sm">
            Manage Shift Overrides →
          </a>
        </div>
      )}
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600">
           <h3 className="text-gray-500 text-sm font-medium">Pending Requests</h3>
           <p className="text-2xl font-bold text-gray-900 mt-1">2</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-600">
           <h3 className="text-gray-500 text-sm font-medium">Active Passes</h3>
           <p className="text-2xl font-bold text-gray-900 mt-1">5</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-orange-600">
           <h3 className="text-gray-500 text-sm font-medium">Monthly Quota</h3>
           <p className="text-2xl font-bold text-gray-900 mt-1">3 / 3</p>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
