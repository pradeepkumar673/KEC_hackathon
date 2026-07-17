import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ListIcon, XIcon, LogoutIcon } from '../../utils/icons';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/live-tracker', label: 'Live Tracker' },
  { to: '/nutrition', label: 'Nutrition' },
  { to: '/progress', label: 'Progress' },
];

const Layout = () => {
  const [open, setOpen] = useState(false);
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14">
          <span className="font-bold text-lg">🔥 Burn-Ex</span>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-6">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? 'text-blue-400' : 'text-gray-300 hover:text-white'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-gray-400">{user?.name}</span>
            <button onClick={logout} className="flex items-center gap-1 text-sm text-gray-300 hover:text-white">
              <LogoutIcon className="w-4 h-4" /> Logout
            </button>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <XIcon className="w-6 h-6" /> : <ListIcon className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile nav */}
        {open && (
          <nav className="md:hidden bg-gray-800 border-t border-gray-700 px-4 py-3 flex flex-col gap-3">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-gray-200">
                {l.label}
              </NavLink>
            ))}
            <button onClick={logout} className="text-left text-gray-300">Logout</button>
          </nav>
        )}
      </header>

      <main className="flex-1 container py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
