import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  UserRoundCheck, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  Hospital,
  ChevronRight,
  ClipboardList,
  FileText,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

interface SidebarProps {
  children: React.ReactNode;
}

const Layout: React.FC<SidebarProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { name: 'Dashboard', icon: BarChart3, path: '/dashboard', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'SECURITY_GUARD', 'SECURITY_HOD', 'EMPLOYEE', 'HOD', 'FACILITY_ADMIN'] },
    { name: 'Gatepass', icon: ClipboardList, path: '/gatepass', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'HOD', 'SECURITY_GUARD', 'SECURITY_HOD', 'EMPLOYEE'] },
    { name: 'Visitors', icon: UserRoundCheck, path: '/visitors', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'SECURITY_GUARD', 'SECURITY_HOD', 'FACILITY_ADMIN'] },
    { name: 'Zones', icon: ShieldAlert, path: '/zones', roles: ['SUPER_ADMIN', 'SECURITY_HOD', 'FACILITY_ADMIN'] },
    { name: 'Administration', isHeader: true, roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
    { name: 'Admin', icon: Settings, path: '/admin', roles: ['SUPER_ADMIN', 'FACILITY_ADMIN'] },
    { name: 'Reports', icon: FileText, path: '/reports', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'SECURITY_HOD', 'FACILITY_ADMIN'] },
  ];

  const filteredMenu = menuItems.filter(item => !user || item.roles.includes(user.role));
  
  // For bottom nav, only take up to 4 main icon routes
  const bottomNavItems = filteredMenu.filter(item => !item.isHeader && item.path).slice(0, 4);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-body text-slate-800">
      
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-64 bg-slate-900 flex-col shrink-0 border-r border-slate-800 text-slate-300 z-20">
        <div className="p-6 border-b border-slate-800 bg-slate-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shrink-0">
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
              <div className="w-10 h-10 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase shrink-0">
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
      <main className="flex-1 flex flex-col min-w-0 relative pb-16 md:pb-0 h-full">
        {/* Header Responsive */}
        <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 shrink-0 shadow-sm">
          {/* Mobile Header Left */}
          <div className="flex md:hidden items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shrink-0">
                <Hospital className="w-5 h-5 text-white" />
             </div>
             <div>
                <h2 className="font-heading font-bold text-sm leading-tight text-slate-800">Nelson</h2>
                <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Garrison</p>
             </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 
              System Health: Nominal
            </div>
            <div className="h-4 w-px bg-slate-200"></div>
            <div className="text-xs text-slate-500 font-medium">
              JWT Session: <span className="text-blue-600">Active</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <button className="hidden sm:block px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider border border-rose-200 text-rose-600 hover:bg-rose-50 rounded bg-white transition-colors">
              Lockdown
            </button>
            <div className="relative cursor-pointer text-slate-500 hover:text-slate-700 transition-colors hidden sm:block">
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              <ShieldAlert className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            
            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden text-slate-600 p-2 -mr-2"
              onClick={() => setIsMobileMenuOpen(true)}
            >
               <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Mobile slide-over menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-slate-900 text-slate-300 shadow-2xl h-full animate-in slide-in-from-right">
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase shrink-0">
                     {user?.name.charAt(0) || 'U'}
                   </div>
                   <div className="flex-1 overflow-hidden">
                     <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                     <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{user?.role}</p>
                   </div>
                 </div>
                 <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 p-2">
                   <X className="w-6 h-6" />
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
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
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium
                        ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}
                      `}
                    >
                      {Icon && <Icon className="w-5 h-5" />}
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
              <div className="p-4 border-t border-slate-800">
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors text-sm font-bold w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          {children}
        </div>
        
        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-40 px-2 h-16 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {bottomNavItems.map(item => {
            const Icon = item.icon as React.ElementType;
            const isActive = location.pathname.startsWith(item.path as string);
            return (
              <NavLink 
                key={item.path} 
                to={item.path as string}
                className="flex flex-col items-center justify-center w-full h-full space-y-1 relative"
              >
                {isActive && <div className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full"></div>}
                <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-blue-700' : 'text-slate-500'}`}>
                  {item.name}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </main>
    </div>
  );
};

export default Layout;
