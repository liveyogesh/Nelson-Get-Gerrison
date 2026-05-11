import React, { useState } from 'react';
import Layout from '../components/Layout';
import { 
  Users, 
  Shield, 
  Settings2, 
  Building2, 
  Workflow, 
  Database,
  Search,
  UserPlus,
  Mail,
  Edit3,
  Trash2,
  Lock,
  UserCircle,
  PieChart
} from 'lucide-react';
import AdminWorkflowBuilder from '../components/AdminWorkflowBuilder';
import AdminVisitorTypes from '../components/AdminVisitorTypes';
import AdminBlacklist from '../components/AdminBlacklist';
import AdminEmployeeDirectory from '../components/AdminEmployeeDirectory';
import AdminConfig from '../components/AdminConfig';
import AdminDashboard from '../components/AdminDashboard';
import AdminRestrictedZones from '../components/AdminRestrictedZones';

import AdminUsersRoles from '../components/AdminUsersRoles';
import AdminDepartments from '../components/AdminDepartments';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('analytics');

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">System Administration</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight mt-1">Manage hospital security infrastructure and user ecosystem</p>
          </div>
        </div>

        {/* Admin Navigation Rails */}
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
          {[
            { id: 'analytics', name: 'Dashboard', icon: PieChart },
            { id: 'users', name: 'Users & Roles', icon: Users },
            { id: 'employees', name: 'Staff', icon: UserCircle },
            { id: 'deps', name: 'Depts', icon: Building2 },
            { id: 'workflow', name: 'Workflows', icon: Workflow },
            { id: 'visitor_types', name: 'Vis. Types', icon: UserPlus },
            { id: 'restricted_zones', name: 'Zones', icon: Lock },
            { id: 'blacklist', name: 'Blacklist', icon: Shield },
            { id: 'security', name: 'Security Hub', icon: Shield },
            { id: 'config', name: 'Settings', icon: Settings2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 group ${
                activeTab === tab.id 
                ? 'bg-slate-800 border-slate-700 text-white shadow-md' 
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-blue-400' : 'group-hover:text-slate-700'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-center">
                {tab.name}
              </span>
            </button>
          ))}
        </div>

        {/* Active Module View */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          {activeTab === 'analytics' && (
            <AdminDashboard />
          )}

          {activeTab === 'users' && (
            <AdminUsersRoles />
          )}

          {activeTab === 'employees' && (
            <AdminEmployeeDirectory />
          )}

          {activeTab === 'deps' && (
            <AdminDepartments />
          )}

          {activeTab === 'workflow' && (
            <AdminWorkflowBuilder />
          )}

          {activeTab === 'visitor_types' && (
            <AdminVisitorTypes />
          )}

          {activeTab === 'blacklist' && (
            <AdminBlacklist />
          )}

          {activeTab === 'restricted_zones' && (
            <AdminRestrictedZones />
          )}

          {activeTab === 'config' && (
            <AdminConfig />
          )}

          {(activeTab !== 'analytics' && activeTab !== 'users' && activeTab !== 'employees' && activeTab !== 'workflow' && activeTab !== 'visitor_types' && activeTab !== 'blacklist' && activeTab !== 'restricted_zones' && activeTab !== 'config') && (
            <div className="flex flex-col items-center justify-center h-[500px] text-center">
              <div className="p-4 bg-slate-50 rounded-full mb-4 border border-slate-100">
                <Settings2 className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">Module Optimization in Progress</h3>
              <p className="text-sm text-slate-500 font-medium max-w-sm mt-1">
                This administrative sub-module is being calibrated for Nelson Hospital compliance rules.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminPanel;
