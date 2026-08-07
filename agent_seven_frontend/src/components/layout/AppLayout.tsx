import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../ui/Spinner';

const pageTitle: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/chat': 'Chat',
  '/workspaces': 'Connected Workspaces',
  '/agent': 'Agent Settings',
  '/memory': 'Memory',
  '/actions': 'Action Items',
};

export function AppLayout() {
  const { isAuthenticated, isLoadingMe } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoadingMe) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'var(--color-bg)' }}
      >
        <Spinner size="lg" style={{ color: 'var(--color-brand)' } as any} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const title = pageTitle[location.pathname] || 'Agent Seven';

  return (
    <div
      className="flex min-h-screen"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Sidebar */}
      <Sidebar
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main content — offset by sidebar width on desktop */}
      <div className="flex flex-col flex-1 min-w-0 lg:pl-64">
        <TopBar
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
