import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../ui/Spinner';
import { MobileNav } from './MobileNav';
import { OfflineBanner } from '../pwa/OfflineBanner';

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
      <OfflineBanner />
      
      {/* Sidebar */}
      <Sidebar
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        className="hidden lg:flex"
      />

      {/* Main content — offset by sidebar width on desktop */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-64 overflow-hidden h-screen">
        <TopBar
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0 relative">
          <Outlet />
        </main>
        
        <MobileNav className="lg:hidden" onMenuClick={() => setSidebarOpen(true)} />
      </div>
    </div>
  );
}
