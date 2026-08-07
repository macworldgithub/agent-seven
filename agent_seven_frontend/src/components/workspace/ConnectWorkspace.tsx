import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { workspaceService } from '../../services/workspace.service';
import { Mail, Calendar, FileText, Hash, Layers, ArrowRight } from 'lucide-react';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const SlackIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
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

const googleAccess = [
  { icon: Mail, label: 'Read & draft emails', color: '#4285F4' },
  { icon: Calendar, label: 'Manage your calendar', color: '#F59E0B' },
  { icon: FileText, label: 'Search Google Drive', color: '#10B981' },
];

const slackAccess = [
  { icon: Hash, label: 'Read DMs & channels', color: '#E01E5A' },
  { icon: Layers, label: 'Summarize threads', color: '#36C5F0' },
  { icon: ArrowRight, label: 'Draft & send replies', color: '#2EB67D' },
];

interface ProviderCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  access: { icon: React.FC<any>; label: string; color: string }[];
  onConnect: () => void;
  loading: boolean;
  accentColor: string;
}

function ProviderCard({
  icon,
  title,
  description,
  access,
  onConnect,
  loading,
  accentColor,
}: ProviderCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex flex-col rounded-xl p-5 transition-all duration-150"
      style={{
        background: 'var(--color-surface-2)',
        border: `1px solid ${hovered ? accentColor + '40' : 'var(--color-border)'}`,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon + title */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{
            width: '48px',
            height: '48px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          {icon}
        </div>
        <div>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            {title}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {description}
          </p>
        </div>
      </div>

      {/* Access list */}
      <div className="space-y-2.5 mb-5 flex-1">
        {access.map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center rounded-md flex-shrink-0"
              style={{ width: '22px', height: '22px', background: `${color}18` }}
            >
              <Icon size={12} style={{ color }} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <Button
        variant="primary"
        size="sm"
        loading={loading}
        onClick={onConnect}
        className="w-full"
        style={accentColor !== 'var(--color-brand)' ? { background: accentColor } : undefined}
      >
        Connect {title.split(' ')[0]}
      </Button>
    </div>
  );
}

export function ConnectWorkspace() {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingSlack, setLoadingSlack] = useState(false);

  const handleGoogleConnect = async () => {
    setLoadingGoogle(true);
    try {
      await workspaceService.initiateGoogleOAuth();
    } catch (error) {
      console.error(error);
      setLoadingGoogle(false);
    }
  };

  const handleSlackConnect = async () => {
    setLoadingSlack(true);
    try {
      await workspaceService.initiateSlackOAuth();
    } catch (error) {
      console.error(error);
      setLoadingSlack(false);
    }
  };

  return (
    <div className="space-y-3">
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
        Choose a provider to connect. You can add multiple workspaces.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProviderCard
          icon={<GoogleIcon />}
          title="Google Workspace"
          description="Gmail, Calendar & Drive"
          access={googleAccess}
          onConnect={handleGoogleConnect}
          loading={loadingGoogle}
          accentColor="#4285F4"
        />
        <ProviderCard
          icon={<SlackIcon />}
          title="Slack Workspace"
          description="Messages & channels"
          access={slackAccess}
          onConnect={handleSlackConnect}
          loading={loadingSlack}
          accentColor="#4A154B"
        />
      </div>
    </div>
  );
}
