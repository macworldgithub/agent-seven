import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Globe,
  Brain,
  CheckSquare,
  Settings,
  Zap,
  LogOut,
  X,
  Menu,
  CreditCard,
  FolderOpen,
  Filter,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

const navMain = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Drive', href: '/drive', icon: FolderOpen },
  { name: 'Workspaces', href: '/workspaces', icon: Globe },
  { name: 'Memory', href: '/memory', icon: Brain },
];

const navSettings = [
  { name: 'Action Items', href: '/actions', icon: CheckSquare },
  { name: 'Email Triage', href: '/triage', icon: Filter },
  { name: 'Watch-list', href: '/watchlist', icon: Eye },
  { name: 'Settings', href: '/agent', icon: Settings },
  { name: 'Billing', href: '/billing', icon: CreditCard },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  className?: string;
}

function NavItem({
  item,
  onClick,
}: {
  item: { name: string; href: string; icon: React.FC<any> };
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer',
          isActive
            ? 'font-medium'
            : 'hover:text-[var(--color-text-secondary)]'
        )
      }
      style={({ isActive }) =>
        isActive
          ? {
              color: 'var(--color-text-primary)',
              background: 'var(--color-brand-dim)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }
          : {
              color: 'var(--color-text-muted)',
              border: '1px solid transparent',
            }
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            size={15}
            style={{
              color: isActive ? 'var(--color-brand-light)' : 'currentColor',
              flexShrink: 0,
            }}
          />
          <span>{item.name}</span>
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({
  user,
  logout,
  onClose,
}: {
  user: any;
  logout: () => void;
  onClose?: () => void;
}) {
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Logo */}
      <div
        className="relative flex items-center gap-3 px-5 flex-shrink-0 overflow-hidden"
        style={{
          height: '64px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* Signature Orb — pulsing gradient sphere */}
        <div
          className="absolute animate-pulse-glow pointer-events-none"
          style={{
            top: '-12px',
            right: '-12px',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 40% 40%, #818CF8 0%, #6366F1 35%, #10B981 70%, transparent 100%)',
            opacity: 0.35,
            filter: 'blur(18px)',
            zIndex: 0,
          }}
        />

        {/* Icon */}
        <div
          className="relative z-10 flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: '28px',
            height: '28px',
            background: 'var(--color-brand-dim)',
            border: '1px solid rgba(99,102,241,0.25)',
          }}
        >
          <Zap size={14} style={{ color: 'var(--color-brand-light)' }} />
        </div>

        <div className="relative z-10 min-w-0">
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            Agent Seven
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              lineHeight: 1.2,
            }}
          >
            AI Chief of Staff
          </div>
        </div>

        {/* Mobile close */}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto relative z-10 p-1 rounded-md transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {/* Section: Main */}
        <p
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--color-text-muted)',
            fontWeight: 600,
            paddingLeft: '12px',
            marginBottom: '6px',
          }}
        >
          Navigation
        </p>

        {navMain.map((item) => (
          <NavItem key={item.href} item={item} onClick={onClose} />
        ))}

        {/* Section: Settings */}
        <p
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--color-text-muted)',
            fontWeight: 600,
            paddingLeft: '12px',
            marginTop: '24px',
            marginBottom: '6px',
          }}
        >
          Manage
        </p>

        {navSettings.map((item) => (
          <NavItem key={item.href} item={item} onClick={onClose} />
        ))}
      </nav>

      {/* User card */}
      <div
        className="flex-shrink-0 p-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div
          className="flex items-center gap-3 p-2 rounded-lg transition-colors duration-150"
          style={{ cursor: 'default' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background =
              'var(--color-surface-2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = 'transparent';
          }}
        >
          {/* Avatar */}
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0 text-xs font-bold"
            style={{
              width: '32px',
              height: '32px',
              background: 'var(--color-brand-dim)',
              color: 'var(--color-brand-light)',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div
              className="truncate"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
              }}
            >
              {user?.name || 'User'}
            </div>
            <div
              className="truncate"
              style={{
                fontSize: '11px',
                color: 'var(--color-text-muted)',
              }}
            >
              {user?.email || ''}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => logout()}
            title="Sign out"
            className="flex-shrink-0 flex items-center justify-center p-1.5 rounded-md transition-all duration-150"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                'var(--color-danger)';
              (e.currentTarget as HTMLButtonElement).style.background =
                'var(--color-danger-dim)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                'var(--color-text-muted)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen, onMobileClose, className }: SidebarProps) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn('hidden lg:flex flex-col fixed inset-y-0 left-0 z-30', className)}
        style={{ width: '256px' }}
      >
        <SidebarContent user={user} logout={logout} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={onMobileClose}
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 lg:hidden flex flex-col',
          mobileOpen ? 'animate-slide-in' : 'hidden'
        )}
        style={{ width: '256px' }}
      >
        <SidebarContent
          user={user}
          logout={logout}
          onClose={onMobileClose}
        />
      </aside>
    </>
  );
}

/** Mobile hamburger button — render this inside TopBar or AppLayout */
export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex lg:hidden items-center justify-center rounded-lg p-2 transition-colors duration-150"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
      }}
    >
      <Menu size={16} />
    </button>
  );
}
