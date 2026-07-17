import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white px-4 text-center">
    <h1 className="text-4xl font-bold mb-2">404</h1>
    <p className="text-gray-400 mb-4">Page not found.</p>
    <Link to="/dashboard" className="text-blue-400 hover:underline">Back to Dashboard</Link>
  </div>
);

export default NotFound;
