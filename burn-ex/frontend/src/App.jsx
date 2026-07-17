import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicRoute from './components/common/PublicRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/common/Layout';
import OfflineBanner from './components/common/OfflineBanner';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WorkoutGenerator from './components/workout/WorkoutGenerator';
import LiveWorkoutTracker from './components/workout/LiveWorkoutTracker';
import Nutrition from './pages/Nutrition';
import ProgressDashboard from './pages/ProgressDashboard';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <LanguageProvider>
        <AuthProvider>
          <OfflineBanner />
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/workout-generator" element={<WorkoutGenerator />} />
              <Route path="/live-tracker" element={<LiveWorkoutTracker />} />
              <Route path="/nutrition" element={<Nutrition />} />
              <Route path="/progress" element={<ProgressDashboard />} />
            </Route>

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
