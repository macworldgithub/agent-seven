import React from 'react';
import { AlertTriangle, ShieldOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function StatusBanner() {
  const { user } = useAuth();

  if (!user) return null;

  const isSuspended = user.isActive === false;

  // Only show banner if user is suspended
  if (!isSuspended) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium"
      style={{
        background: 'rgba(239, 68, 68, 0.08)',
        borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
        color: 'rgb(248, 113, 113)',
      }}
    >
      <AlertTriangle size={16} className="flex-shrink-0" />
      <span>
        <strong>Account Suspended:</strong> Your account has been suspended by an administrator.
        Access to team workspaces is restricted. Contact your organization admin for assistance.
      </span>
    </div>
  );
}
