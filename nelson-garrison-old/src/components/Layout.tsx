import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  UserRoundCheck, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  Hospital,
  ChevronRight,
  ClipboardList,
  FileText
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

interface SidebarProps {
  children: React.ReactNode;
}

const Layout: React.FC<SidebarProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { name: 'Operational Control', isHeader: true, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'SECURITY_GUARD', 'SECURITY_HOD'] },
    { name: 'Dashboard', icon: BarChart3, path: '/dashboard', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'SECURITY_GUARD', 'SECURITY_HOD'] },
    { name: 'Staff Gatepass', icon: ClipboardList, path: '/gatepass', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'HOD', 'SECURITY_GUARD', 'SECURITY_HOD'] },
    { name: 'Visitor Registry', icon: UserRoundCheck, path: '/visitors', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'SECURITY_GUARD', 'SECURITY_HOD'] },
    { name: 'Restricted Zones', icon: ShieldAlert, path: '/zones', roles: ['SUPER_ADMIN', 'SECURITY_HOD'] },
    { name: 'Administration', isHeader: true, roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
    { name: 'Admin Console', icon: Settings, path: '/admin', roles: ['SUPER_ADMIN'] },
    { name: 'Reports', icon: FileText, path: '/reports', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'SECURITY_HOD'] },
  ];

  const filteredMenu = menuItems.filter(item => !user || item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-body text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0 border-r border-slate-800 text-slate-300 z-20">
        <div className="p-6 border-b border-slate-800 bg-slate-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <Hospital className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg leading-tight text-white">Nelson</h2>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Garrison</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredMenu.map((item, index) => {
            if (item.isHeader) {
              return (
                <div key={index} className={`text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 py-2 ${index !== 0 ? 'pt-4' : ''}`}>
                  {item.name}
                </div>
              );
            }
            const Icon = item.icon as React.ElementType;
            return (
              <NavLink
                key={item.path}
                to={item.path as string}
                className={({ isActive }) => `
                  flex items-center justify-between px-3 py-2 rounded-md transition-colors group
                  ${isActive ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500 font-medium' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <div className="flex items-center gap-3">
                  {Icon && <Icon className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" />}
                  <span className="text-sm">{item.name}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-40 transition-all group-hover:translate-x-1" />
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase">
                {user?.name.charAt(0) || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{user?.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors text-xs font-semibold w-full justify-start"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 
              System Health: Nominal
            </div>
            <div className="h-4 w-px bg-slate-200"></div>
            <div className="text-xs text-slate-500 font-medium">
              JWT Session: <span className="text-blue-600">Active</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-rose-200 text-rose-600 hover:bg-rose-50 rounded bg-white transition-colors">
              Emergency Lockdown
            </button>
            <div className="relative cursor-pointer text-slate-500 hover:text-slate-700 transition-colors">
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
