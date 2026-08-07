import React, { useState } from 'react';
import { Workspace } from '../../types';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import { useUpdatePermissions } from '../../hooks/useWorkspace';
import { Mail, Calendar, FileText, MessageSquare, Save } from 'lucide-react';

interface PermissionMatrixProps {
  workspace: Workspace;
  onClose: () => void;
}

const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  READ_EMAIL: { label: 'Read Emails', description: 'Allow Agent Seven to read and summarize your emails' },
  DRAFT_EMAIL: { label: 'Draft Emails', description: 'Allow Agent Seven to prepare draft replies for you' },
  SEND_EMAIL: { label: 'Send Emails', description: 'Allow Agent Seven to send emails on your behalf' },
  SEND_EMAIL_WITH_APPROVAL: { label: 'Send Emails (Approval Required)', description: 'Send emails after you approve them' },
  CALENDAR_READ: { label: 'View Schedule', description: 'Allow Agent Seven to check your availability' },
  CALENDAR_WRITE: { label: 'Manage Events', description: 'Allow Agent Seven to schedule meetings for you' },
  DRIVE_READ: { label: 'Search & Read Files', description: 'Allow Agent Seven to find information in your documents' },
  DRIVE_WRITE: { label: 'Write Files', description: 'Allow Agent Seven to create and edit files in your Drive' },
  SLACK_READ: { label: 'Read Messages', description: 'Allow Agent Seven to read channel messages and DMs' },
  SLACK_SEND: { label: 'Send Messages', description: 'Allow Agent Seven to reply on your behalf in Slack' },
};

export function PermissionMatrix({ workspace, onClose }: PermissionMatrixProps) {
  const updateMutation = useUpdatePermissions(workspace.id);
  const [grantedPermissions, setGrantedPermissions] = useState<string[]>(workspace.permissions || []);

  const handleToggle = (scope: string, checked: boolean) => {
    setGrantedPermissions((prev) =>
      checked ? [...prev, scope] : prev.filter((p) => p !== scope)
    );
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync(grantedPermissions);
    onClose();
  };

  const renderSection = (
    icon: React.ReactNode,
    label: string,
    scopes: string[]
  ) => (
    <div className="space-y-3">
      <div
        className="flex items-center gap-2 pb-2"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {icon}
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {label}
        </h4>
      </div>
      <div className="space-y-3 pl-2">
        {scopes.map((scope) => {
          const info = PERMISSION_LABELS[scope];
          if (!info) return null;
          return (
            <Toggle
              key={scope}
              label={info.label}
              description={info.description}
              checked={grantedPermissions.includes(scope)}
              onChange={(c) => handleToggle(scope, c)}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
        Configure what Agent Seven can access within this workspace. You can revoke these permissions at any time.
      </p>

      {workspace.provider === 'google' && (
        <>
          {renderSection(
            <Mail size={14} style={{ color: '#4285F4' }} />,
            'Gmail Access',
            ['READ_EMAIL', 'DRAFT_EMAIL', 'SEND_EMAIL', 'SEND_EMAIL_WITH_APPROVAL']
          )}
          {renderSection(
            <Calendar size={14} style={{ color: '#F59E0B' }} />,
            'Calendar Access',
            ['CALENDAR_READ', 'CALENDAR_WRITE']
          )}
          {renderSection(
            <FileText size={14} style={{ color: '#10B981' }} />,
            'Google Drive',
            ['DRIVE_READ', 'DRIVE_WRITE']
          )}
        </>
      )}

      {workspace.provider === 'slack' && (
        renderSection(
          <MessageSquare size={14} style={{ color: '#E01E5A' }} />,
          'Slack Access',
          ['SLACK_READ', 'SLACK_SEND']
        )
      )}

      <div
        className="flex justify-end gap-3 pt-4"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Save size={13} />}
          loading={updateMutation.isPending}
          onClick={handleSave}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
