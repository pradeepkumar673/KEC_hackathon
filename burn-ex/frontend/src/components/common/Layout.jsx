import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/workout-generator', label: 'Workout Generator', icon: 'fitness_center' },
  { to: '/live-tracker', label: 'Live Tracker', icon: 'sensors' },
  { to: '/nutrition', label: 'Nutrition', icon: 'restaurant' },
  { to: '/progress', label: 'Progress', icon: 'monitoring' },
];

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#fcdbd6] flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="w-64 border-r border-[#5d3f3b]/20 bg-[#1f0f0d] flex-col py-6 px-4 hidden md:flex min-h-screen sticky top-0">
        <div className="mb-8">
          <h1 className="font-extrabold text-3xl text-red-500 tracking-tighter cursor-pointer" onClick={() => navigate('/dashboard')}>
            Burn-Ex
          </h1>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Elite Performance</p>
        </div>
        
        <nav className="flex-1 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'text-red-400 font-bold bg-gradient-to-r from-red-500/10 to-transparent border-r-4 border-red-500 shadow-[0_0_15px_rgba(255,85,69,0.1)]'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
                }`
              }
            >
              <span className="material-symbols-outlined">{l.icon}</span>
              <span className="text-sm font-medium">{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="pt-6 border-t border-gray-800 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
              <span className="material-symbols-outlined text-gray-500 flex items-center justify-center h-full">person</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{user?.name}</span>
              <span className="text-[10px] text-gray-500 truncate">{user?.email}</span>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden h-16 bg-[#1f0f0d] border-b border-[#5d3f3b]/20 flex justify-between items-center px-4 sticky top-0 z-50">
        <h1 className="font-extrabold text-2xl text-red-500 tracking-tighter" onClick={() => navigate('/dashboard')}>
          Burn-Ex
        </h1>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)} 
          className="text-white focus:outline-none p-1"
          aria-label="Toggle Navigation"
        >
          <span className="material-symbols-outlined text-2xl">
            {mobileOpen ? 'close' : 'menu'}
          </span>
        </button>
      </header>

      {/* Mobile Nav Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-[#0A0A0A]/95 z-40 pt-20 px-6 flex flex-col gap-4 animate-fade-in">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                  isActive ? 'bg-red-500/10 text-red-400 font-bold border-r-4 border-red-500' : 'text-gray-400'
                }`
              }
            >
              <span className="material-symbols-outlined">{l.icon}</span>
              <span className="text-base font-semibold">{l.label}</span>
            </NavLink>
          ))}
          <div className="mt-auto pb-8 border-t border-gray-800 pt-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-800 overflow-hidden border border-gray-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-500">person</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={() => { setMobileOpen(false); logout(); }} 
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="text-base font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Page Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - Desktop */}
        <header className="hidden md:flex h-16 bg-[#1f0f0d]/80 backdrop-blur-xl border-b border-[#5d3f3b]/20 justify-between items-center px-8 sticky top-0 z-30">
          <div className="relative w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
            <input 
              type="text" 
              placeholder="Search metrics..." 
              className="w-full bg-[#291715] border-none rounded-full py-1.5 pl-10 pr-4 text-xs text-[#fcdbd6] focus:ring-1 focus:ring-red-500 placeholder-gray-500"
            />
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/live-tracker')}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500 text-red-500 font-bold text-xs hover:bg-red-500/5 transition-all"
            >
              <span className="material-symbols-outlined text-xs">sensors</span>
              Go Live
            </button>
            <span className="material-symbols-outlined text-gray-400 hover:text-red-500 cursor-pointer transition-colors">notifications</span>
            <div className="h-8 w-8 rounded-full bg-gray-800 overflow-hidden border border-gray-700 flex items-center justify-center cursor-pointer" onClick={() => navigate('/progress')}>
              <span className="material-symbols-outlined text-gray-500">person</span>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
