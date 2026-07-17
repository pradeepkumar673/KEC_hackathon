import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { languages, useLanguage } from '../../context/LanguageContext';

const links = [
  { to: '/dashboard', labelKey: 'dashboard', icon: 'dashboard' },
  { to: '/workout-generator', labelKey: 'workoutGenerator', icon: 'fitness_center' },
  { to: '/live-tracker', labelKey: 'liveCoach', icon: 'sensors' },
  { to: '/nutrition', labelKey: 'nutrition', icon: 'restaurant' },
  { to: '/progress', labelKey: 'progress', icon: 'monitoring' },
];

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-on-surface flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="w-64 border-r border-outline-variant bg-surface flex-col py-6 px-4 hidden md:flex min-h-screen sticky top-0">
        <div className="mb-8 px-2">
          <h1 className="font-extrabold text-3xl text-primary tracking-tighter cursor-pointer font-display-lg" onClick={() => navigate('/dashboard')}>
            Burn-Ex
          </h1>
          <p className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold opacity-60">Elite Performance</p>
        </div>
        
        <nav className="flex-1 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'text-primary font-bold bg-gradient-to-r from-primary/10 to-transparent border-r-4 border-primary shadow-[0_0_15px_rgba(255,180,170,0.2)]'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
                }`
              }
            >
              <span className="material-symbols-outlined">{l.icon}</span>
              <span className="text-sm font-medium">{t(l.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="pt-6 border-t border-outline-variant flex flex-col gap-3">
          <label className="flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">language</span>{t('language')}
            <select value={language} onChange={(event) => setLanguage(event.target.value)} className="ml-auto max-w-[112px] rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1 text-xs normal-case text-on-surface outline-none focus:border-primary">
              {languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant">
              <span className="material-symbols-outlined text-on-surface-variant flex items-center justify-center h-full">person</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-on-surface truncate">{user?.name}</span>
              <span className="text-[10px] text-on-surface-variant truncate">{user?.email}</span>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="text-sm font-medium">{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-4 sticky top-0 z-50">
        <h1 className="font-extrabold text-2xl text-primary tracking-tighter font-display-lg" onClick={() => navigate('/dashboard')}>
          Burn-Ex
        </h1>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)} 
          className="text-on-surface focus:outline-none p-1"
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
                  isActive ? 'bg-primary/10 text-primary font-bold border-r-4 border-primary' : 'text-on-surface-variant'
                }`
              }
            >
              <span className="material-symbols-outlined">{l.icon}</span>
              <span className="text-base font-semibold">{t(l.labelKey)}</span>
            </NavLink>
          ))}
          <div className="mt-auto pb-8 border-t border-outline-variant pt-6 flex flex-col gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-on-surface-variant"><span className="material-symbols-outlined">language</span>{t('language')}
              <select value={language} onChange={(event) => setLanguage(event.target.value)} className="ml-auto rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1 text-xs text-on-surface outline-none">{languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select>
            </label>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">{user?.name}</p>
                <p className="text-xs text-on-surface-variant">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={() => { setMobileOpen(false); logout(); }} 
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="text-base font-medium">{t('logout')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Page Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - Desktop */}
        <header className="hidden md:flex h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant justify-between items-center px-8 sticky top-0 z-30">
          <div className="relative w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
            <input 
              type="text" 
              placeholder={t('search')} 
              className="w-full bg-surface-container-low border-none rounded-full py-1.5 pl-10 pr-4 text-xs text-on-surface focus:ring-1 focus:ring-primary placeholder-on-surface-variant"
            />
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/live-tracker')}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary text-primary font-bold text-xs hover:bg-primary/5 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-xs">sensors</span>
              {t('goLive')}
            </button>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer transition-colors">notifications</span>
            <div className="h-8 w-8 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant flex items-center justify-center cursor-pointer" onClick={() => navigate('/progress')}>
              <span className="material-symbols-outlined text-on-surface-variant">person</span>
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
