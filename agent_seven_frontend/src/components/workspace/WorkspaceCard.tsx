import React, { useState } from 'react';
import { Workspace } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatRelativeTime } from '../../lib/utils';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Shield,
  Calendar,
  Mail,
  FileText,
  MessageSquare,
  Star,
  Settings,
} from 'lucide-react';
import { useTestConnection, useRevokeWorkspace, useReconnectWorkspace } from '../../hooks/useWorkspace';

interface WorkspaceCardProps {
  workspace: Workspace;
  onManagePermissions: (workspace: Workspace) => void;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const SlackIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.521 2.528 2.528 0 01-2.522-2.52 2.528 2.528 0 012.521-2.521h2.521v2.52z" fill="#E01E5A" />
    <path d="M6.313 15.165a2.528 2.528 0 012.521-2.521 2.528 2.528 0 012.521 2.52v6.313a2.528 2.528 0 01-2.52 2.522 2.528 2.528 0 01-2.522-2.522v-6.312z" fill="#E01E5A" />
    <path d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.521v2.521H8.834z" fill="#36C5F0" />
    <path d="M8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.52 2.521H2.521A2.528 2.528 0 010 8.834a2.528 2.528 0 012.521-2.521h6.313z" fill="#36C5F0" />
    <path d="M18.956 8.834a2.528 2.528 0 012.521-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.521 2.521h-2.521V8.834z" fill="#2EB67D" />
    <path d="M17.688 8.834a2.528 2.528 0 01-2.521 2.521 2.528 2.528 0 01-2.521-2.52V2.521A2.528 2.528 0 0115.167 0a2.528 2.528 0 012.521 2.521v6.313z" fill="#2EB67D" />
    <path d="M15.167 18.956a2.528 2.528 0 012.521 2.521A2.528 2.528 0 0115.167 24a2.528 2.528 0 01-2.521-2.521v-2.521h2.521z" fill="#ECB22E" />
    <path d="M15.167 17.688a2.528 2.528 0 01-2.521-2.521 2.528 2.528 0 012.52-2.521h6.313A2.528 2.528 0 0124 15.167a2.528 2.528 0 01-2.521 2.521h-6.312z" fill="#ECB22E" />
  </svg>
);

function getStatusBadge(status: string): { variant: 'success' | 'warning' | 'error' | 'default'; label: string } {
  switch (status) {
    case 'active': return { variant: 'success', label: 'Active' };
    case 'expiring_soon': return { variant: 'warning', label: 'Expiring Soon' };
    case 'expired': return { variant: 'error', label: 'Expired' };
    case 'revoked': return { variant: 'default', label: 'Revoked' };
    default: return { variant: 'default', label: 'Unknown' };
  }
}

const googlePermissions = [
  { icon: Mail, label: 'Gmail', color: '#4285F4' },
  { icon: Calendar, label: 'Calendar', color: '#F59E0B' },
  { icon: FileText, label: 'Drive', color: '#10B981' },
];

export function WorkspaceCard({ workspace, onManagePermissions }: WorkspaceCardProps) {
  const testMutation = useTestConnection(workspace.id);
  const revokeMutation = useRevokeWorkspace(workspace.id);
  const reconnectMutation = useReconnectWorkspace(workspace.id);
  const [hovered, setHovered] = useState(false);

  const statusBadge = getStatusBadge(workspace.status);
  const isExpired = workspace.status === 'expired';

  const handleTest = async () => {
    try {
      await testMutation.mutateAsync();
      alert('Connection successful!');
    } catch (e: any) {
      alert(`Connection failed: ${e.message}`);
    }
  };

  const handleRevoke = async () => {
    if (confirm(`Revoke access to ${workspace.name}? This cannot be undone.`)) {
      await revokeMutation.mutateAsync();
    }
  };

  const handleReconnect = async () => {
    try {
      await reconnectMutation.mutateAsync();
    } catch (e: any) {
      alert(`Reconnect failed: ${e.message}`);
    }
  };

  return (
    <div
      className="rounded-xl transition-all duration-150"
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${hovered ? 'var(--color-border-light)' : 'var(--color-border)'}`,
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Main row */}
      <div className="flex items-start sm:items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          {/* Provider icon */}
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{
              width: '44px',
              height: '44px',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
            }}
          >
            {workspace.provider === 'google' ? <GoogleIcon /> : <SlackIcon />}
          </div>

          {/* Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                {workspace.name}
              </h3>
              {workspace.isDefault && (
                <span
                  className="flex items-center gap-1"
                  style={{
                    fontSize: '11px',
                    color: '#F59E0B',
                    fontWeight: 500,
                  }}
                >
                  <Star size={10} fill="currentColor" />
                  Default
                </span>
              )}
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
              {workspace.email}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Last connected {formatRelativeTime(workspace.lastConnectedAt)}
            </p>
          </div>
        </div>

        {/* Scopes pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-full"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
          }}
        >
          <Shield size={11} />
          {workspace.permissions.length} scopes
        </div>
      </div>

      {/* Permissions row */}
      {workspace.provider === 'google' && (
        <div
          className="flex flex-wrap gap-2 px-5 pb-4"
        >
          {googlePermissions.map(({ icon: Icon, label, color }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Icon size={10} style={{ color }} />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Expired warning message */}
      {isExpired && (
        <div className="px-5 py-2" style={{ background: 'rgba(239, 68, 68, 0.1)', borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <p style={{ fontSize: '12px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} />
            Token expired. Click Reconnect to restore access.
          </p>
        </div>
      )}

      {/* Actions row */}
      <div
        className="flex items-center gap-2 px-5 py-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        {isExpired ? (
          <Button 
            variant="primary" 
            size="sm"
            loading={reconnectMutation.isPending}
            onClick={handleReconnect}
          >
            Reconnect
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw size={12} />}
            loading={testMutation.isPending}
            onClick={handleTest}
          >
            Test
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Settings size={12} />}
          onClick={() => onManagePermissions(workspace)}
        >
          Permissions
        </Button>
        <div style={{ flex: 1 }} />
        <Button
          variant="danger"
          size="sm"
          leftIcon={<Trash2 size={12} />}
          loading={revokeMutation.isPending}
          onClick={handleRevoke}
        >
          Revoke
        </Button>
      </div>
    </div>
  );
}
