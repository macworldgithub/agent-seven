import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { AgentConfig } from './pages/AgentConfig';
import { WorkspaceSettings } from './pages/WorkspaceSettings';
import { AgentChat } from './components/agent/AgentChat';
import { MemoryPage } from './pages/Memory';
import { ActionItemsPage } from './pages/ActionItems';
import { Billing } from './pages/Billing';
import { BillingSuccess } from './pages/BillingSuccess';
import { BillingCancel } from './pages/BillingCancel';
import { Drive } from './pages/Drive';
import { EmailTriage } from './pages/EmailTriage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminRoute } from './components/auth/AdminRoute';
import { useAuth } from './hooks/useAuth';
import { AuthCallback } from './pages/AuthCallback';
import './App.css';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" replace />} />
      
      {/* Protected Routes */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/onboarding" element={isAuthenticated ? <Onboarding /> : <Navigate to="/login" replace />} />
      
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<AgentChat />} />
        <Route path="/drive" element={<Drive />} />
        <Route path="/workspaces" element={<WorkspaceSettings />} />
        <Route path="/agent" element={<AgentConfig />} />
        <Route path="/memory" element={<MemoryPage />} />
        <Route path="/actions" element={<ActionItemsPage />} />
        <Route path="/triage" element={<EmailTriage />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/billing/success" element={<BillingSuccess />} />
        <Route path="/billing/cancel" element={<BillingCancel />} />
      </Route>
    </Routes>
  );
}

export default App;
