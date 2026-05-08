import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { PrivateRoute } from './components/PrivateRoute';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import SecurityCommandCenter from './pages/SecurityCommandCenter';
import SecurityDashboard from './components/SecurityDashboard';
import CorporateDashboard from './components/CorporateDashboard';
import AdminSettings from './components/AdminSettings';
import QRScanner from './pages/QRScanner';

import SecuritySettings from './pages/SecuritySettings';

import GatepassApprovals from './components/GatepassApprovals';

import RoleManager from './components/RoleManager';
import AuditLogs from './components/AuditLogs';
import FacilityHierarchy from './components/FacilityHierarchy';
import ShiftOverridesManager from './components/ShiftOverridesManager';

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
        <Route path="/security/command-center" element={<PrivateRoute allowedRoles={['SECHOD', 'SUPER_ADMIN']}><SecurityCommandCenter /></PrivateRoute>} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/super-admin" element={<Dashboard />} />
                <Route path="/terminal" element={<SecurityDashboard />} />
                <Route path="/corporate" element={<CorporateDashboard />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/roles" element={<RoleManager />} />
                <Route path="/admin/audit" element={<AuditLogs />} />
                <Route path="/admin/facilities" element={<FacilityHierarchy />} />
                <Route path="/hr/shift-overrides" element={<ShiftOverridesManager />} />
                <Route path="/approvals" element={<GatepassApprovals />} />
                <Route path="/scanner" element={<QRScanner />} />
                <Route path="/security-settings" element={<SecuritySettings />} />
                <Route path="/hr-center" element={<div>HR Compliance Center</div>} />
                <Route path="/admin-dashboard" element={<div>Facility Admin</div>} />
                <Route path="/staff-dashboard" element={<div>Staff Dashboard</div>} />
                <Route path="*" element={<div className="p-8 text-center"><h1 className="text-2xl font-bold">404 - Page Not Found</h1><a href="/" className="text-blue-600 hover:underline">Go to Dashboard</a></div>} />
              </Routes>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
