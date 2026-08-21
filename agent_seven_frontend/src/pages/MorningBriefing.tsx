import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBriefing } from '../hooks/useBriefing';
import { briefingService, Briefing } from '../services/briefing.service';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MarkdownRenderer } from '../components/ui/MarkdownRenderer';
import {
  Sun,
  Zap,
  Copy,
  CheckCircle,
  Loader,
  Mail,
  CheckSquare,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

const GENERATING_STEPS = [
  { label: 'Checking unread emails...', delay: 0 },
  { label: 'Reviewing today\'s calendar...', delay: 3000 },
  { label: 'Scanning action items...', delay: 6000 },
  { label: 'Checking Slack messages...', delay: 10000 },
  { label: 'Writing your briefing...', delay: 15000 },
];

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function GeneratingView() {
  const [stepsDone, setStepsDone] = useState<boolean[]>(GENERATING_STEPS.map(() => false));

  useEffect(() => {
    const timers = GENERATING_STEPS.map((step, i) =>
      setTimeout(() => {
        setStepsDone((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, step.delay + 2000), // mark done 2s after showing
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Card padding="md" style={{ marginTop: '24px' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        {/* Animated sun */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(245,158,11,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sun
              size={32}
              style={{
                color: 'var(--color-warning)',
                animation: 'spin 3s linear infinite',
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(245,158,11,0.3)',
              animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
        </div>

        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: '8px',
          }}
        >
          Generating your briefing...
        </h3>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            marginBottom: '24px',
          }}
        >
          Checking emails, calendar, and action items
        </p>

        {/* Steps */}
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {GENERATING_STEPS.map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: stepsDone[i] ? 'var(--color-accent)' : 'var(--color-text-muted)',
                transition: 'color 0.3s ease',
              }}
            >
              {stepsDone[i] ? (
                <CheckCircle size={12} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
              ) : (
                <Loader
                  size={12}
                  style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}
                />
              )}
              {step.label}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function EmptyState({
  status,
  onGenerate,
}: {
  status: any;
  onGenerate: () => void;
}) {
  return (
    <Card padding="md" style={{ marginTop: '24px' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(245,158,11,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <Sun size={32} style={{ color: 'var(--color-warning)' }} />
        </div>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: '8px',
          }}
        >
          No briefing yet today
        </h3>
        {status?.isEnabled ? (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
            Your briefing is scheduled for {status.configuredTime} ({status.timezone})
          </p>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
            Morning briefings are not enabled yet. Enable them in Settings.
          </p>
        )}
        <p
          style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            marginBottom: '24px',
          }}
        >
          Or generate one now to see what needs your attention
        </p>
        <Button variant="primary" onClick={onGenerate}>
          <Zap size={14} style={{ marginRight: '6px' }} />
          Generate Briefing Now
        </Button>
      </div>
    </Card>
  );
}

export function MorningBriefing() {
  const { id: paramId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { latestBriefing, history, status, loading, generating, triggerBriefing } = useBriefing();
  const [selectedBriefing, setSelectedBriefing] = useState<Briefing | null>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load specific briefing if ID in URL
  useEffect(() => {
    if (paramId) {
      setLoadingSelected(true);
      briefingService
        .getBriefingById(paramId)
        .then((b) => setSelectedBriefing(b))
        .catch(() => setSelectedBriefing(null))
        .finally(() => setLoadingSelected(false));
    } else {
      setSelectedBriefing(null);
    }
  }, [paramId]);

  const displayedBriefing = selectedBriefing || latestBriefing;
  const isToday = displayedBriefing
    ? new Date(displayedBriefing.createdAt).toDateString() === new Date().toDateString()
    : false;

  const handleCopy = () => {
    if (displayedBriefing?.content) {
      navigator.clipboard.writeText(displayedBriefing.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startChatWith = (message: string) => {
    sessionStorage.setItem('prefill_chat', message);
    navigate('/chat');
  };

  return (
    <div
      className="animate-fade-in"
      style={{ maxWidth: '768px', margin: '0 auto', padding: '32px 24px' }}
    >
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Morning Briefing
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-text-muted)',
              marginTop: '4px',
            }}
          >
            Your daily AI-generated brief
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Status pill */}
          {status && !loading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 500,
                background: status.hasRunToday
                  ? 'rgba(16,185,129,0.1)'
                  : 'var(--color-surface-2)',
                border: `1px solid ${status.hasRunToday ? 'rgba(16,185,129,0.2)' : 'var(--color-border)'}`,
                color: status.hasRunToday ? 'var(--color-accent)' : 'var(--color-text-muted)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: status.hasRunToday ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  flexShrink: 0,
                }}
              />
              {status.hasRunToday
                ? `Ran today at ${new Date(status.lastRanAt!).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
                : 'Not run yet today'}
            </div>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={triggerBriefing}
            loading={generating}
          >
            <Zap size={13} style={{ marginRight: '4px' }} />
            Generate Now
          </Button>
        </div>
      </div>

      {/* Main content area */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-brand)' }} />
        </div>
      ) : generating ? (
        <GeneratingView />
      ) : displayedBriefing ? (
        <>
          {/* Briefing card */}
          <Card padding="md" style={{ marginTop: '0' }}>
            {/* Card header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '24px',
                paddingBottom: '24px',
                borderBottom: '1px solid var(--color-border)',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px',
                  }}
                >
                  <Sun size={15} style={{ color: 'var(--color-warning)' }} />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--color-warning)',
                    }}
                  >
                    Morning Briefing
                  </span>
                  {isToday && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '10px',
                        background: 'rgba(16,185,129,0.1)',
                        color: 'var(--color-accent)',
                        border: '1px solid rgba(16,185,129,0.2)',
                      }}
                    >
                      TODAY
                    </span>
                  )}
                </div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    margin: 0,
                  }}
                >
                  {displayedBriefing.title}
                </h2>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    marginTop: '4px',
                  }}
                >
                  Generated at{' '}
                  {new Date(displayedBriefing.createdAt).toLocaleString('en-AU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <CheckCircle size={13} style={{ marginRight: '4px' }} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={13} style={{ marginRight: '4px' }} /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Briefing content */}
            <MarkdownRenderer content={displayedBriefing.content} />

            {/* Quick actions */}
            <div
              style={{
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '12px',
                }}
              >
                Quick Actions
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <Button variant="secondary" size="sm" onClick={() => navigate('/actions')}>
                  <CheckSquare size={13} style={{ marginRight: '4px' }} />
                  View Action Items
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/triage')}>
                  <Mail size={13} style={{ marginRight: '4px' }} />
                  Check Emails
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    startChatWith(
                      'Tell me more about my morning briefing and what I should prioritize today',
                    )
                  }
                >
                  <MessageSquare size={13} style={{ marginRight: '4px' }} />
                  Discuss with Agent
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/agent')}>
                  <RefreshCw size={13} style={{ marginRight: '4px' }} />
                  Briefing Settings
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <EmptyState status={status} onGenerate={triggerBriefing} />
      )}

      {/* Previous briefings */}
      {history.length > 1 && !paramId && (
        <div style={{ marginTop: '32px' }}>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: '16px',
            }}
          >
            Previous Briefings
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.slice(1).map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/briefing/${item.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    'var(--color-border-light)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)';
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--color-text-primary)',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.preview}
                  </p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexShrink: 0,
                    marginLeft: '12px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {formatRelativeTime(item.createdAt)}
                  </span>
                  <ChevronRight size={15} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Briefing settings hint */}
      {status && !status.isEnabled && !loading && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(99,102,241,0.05)',
            border: '1px solid rgba(99,102,241,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              Enable automatic briefings
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Get a daily brief delivered at your chosen time every morning
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/agent')}>
            <Calendar size={13} style={{ marginRight: '4px' }} />
            Open Settings
          </Button>
        </div>
      )}
    </div>
  );
}
