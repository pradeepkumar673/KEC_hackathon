import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A] text-on-surface px-4 text-center animate-fade-in">
    <span className="material-symbols-outlined text-5xl text-primary mb-3">error</span>
    <h1 className="text-3xl font-extrabold mb-1 font-display-md text-white">404</h1>
    <p className="text-xs text-on-surface-variant mb-6 font-semibold">The requested route does not exist.</p>
    <Link 
      to="/dashboard" 
      className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold transition duration-200 active:scale-95 shadow-lg shadow-primary/20 font-label-bold"
    >
      Back to Dashboard
    </Link>
  </div>
);

export default NotFound;
