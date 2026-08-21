import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWorkspaces } from '../hooks/useWorkspace';
import { useConversations } from '../hooks/useAgent';
import { useTriage } from '../hooks/useTriage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { agentService } from '../services/agent.service';
import api from '../lib/axios';
import {
  MessageSquare,
  Globe,
  Brain,
  Zap,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckSquare,
  Clock,
  Plus,
  Sun,
} from 'lucide-react';
import { useBriefing } from '../hooks/useBriefing';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}


interface StatCardProps {
  icon: React.FC<any>;
  iconBg: string;
  iconColor: string;
  value: string | number;
  label: string;
  trend?: { value: string; up: boolean };
}

function StatCard({ icon: Icon, iconBg, iconColor, value, label, trend }: StatCardProps) {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ width: '40px', height: '40px', background: iconBg }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        {trend && (
          <div
            className="flex items-center gap-1"
            style={{ fontSize: '11px', fontWeight: 500, color: trend.up ? 'var(--color-accent)' : 'var(--color-danger)' }}
          >
            {trend.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.value}
          </div>
        )}
      </div>
      <div
        style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}
      >
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
        {label}
      </div>
    </Card>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces();
  const { data: conversations } = useConversations();
  const { summary: triageSummary, emails } = useTriage();
  const navigate = useNavigate();
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [memoriesCount, setMemoriesCount] = useState(0);
  const [isFreePlan, setIsFreePlan] = useState(false);
  const { latestBriefing, status: briefingStatus, generating: briefingGenerating, triggerBriefing } = useBriefing();

  useEffect(() => {
    api.get('/memory/action-items?status=OPEN')
      .then(res => setActionItems(res.data.data || res.data || []))
      .catch(err => console.error('Failed to fetch action items', err));
      
    api.get('/memory/summary')
      .then(res => setMemoriesCount(res.data.data?.total || res.data?.total || 0))
      .catch(err => console.error('Failed to fetch memory summary', err));

    agentService.getSubscription()
      .then(sub => setIsFreePlan(sub.plan === 'FREE'))
      .catch(err => console.error('Failed to fetch subscription', err));
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Founder';


  return (
    <div
      className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in"
      style={{ minHeight: 'calc(100vh - 64px)' }}
    >
      {isFreePlan && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-medium text-warning">You're on the free plan</p>
            <p className="text-xs text-muted">Limited to 20 AI actions per day</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/billing')}>
            Upgrade Now
          </Button>
        </div>
      )}

      {/* Morning Briefing Widget */}
      <div
        style={{
          padding: '16px',
          borderRadius: '16px',
          border: '1px solid rgba(245,158,11,0.2)',
          background: 'rgba(245,158,11,0.04)',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(245,158,11,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sun size={20} style={{ color: 'var(--color-warning)' }} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                Morning Briefing
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {briefingStatus?.hasRunToday
                  ? `Generated at ${briefingStatus.lastRanAt ? new Date(briefingStatus.lastRanAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : ''}`
                  : briefingStatus?.isEnabled
                  ? `Scheduled for ${briefingStatus.configuredTime}`
                  : 'Not configured — enable in Settings'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {briefingStatus?.hasRunToday ? (
              <Button variant="secondary" size="sm" onClick={() => navigate('/briefing')}>
                View Briefing
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={triggerBriefing} loading={briefingGenerating}>
                <Zap size={12} style={{ marginRight: '4px' }} />
                Generate Now
              </Button>
            )}
          </div>
        </div>

        {/* Preview */}
        {latestBriefing && briefingStatus?.hasRunToday && (
          <div
            style={{
              marginTop: '14px',
              paddingTop: '14px',
              borderTop: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
              {latestBriefing.preview}
            </p>
            <button
              onClick={() => navigate('/briefing')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '12px',
                color: 'var(--color-warning)',
                cursor: 'pointer',
                marginTop: '8px',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Read full briefing →
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="mb-6">
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {getGreeting()},{' '}
          <span style={{ color: 'var(--color-brand-light)' }}>{firstName}</span>
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Here's what's happening across your workspaces
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Globe}
          iconBg="rgba(99,102,241,0.12)"
          iconColor="var(--color-brand-light)"
          value={workspaces?.length || 0}
          label="Connected Workspaces"
          trend={{ value: '+1 this week', up: true }}
        />
        <StatCard
          icon={CheckSquare}
          iconBg="rgba(245,158,11,0.12)"
          iconColor="var(--color-warning)"
          value={actionItems.length}
          label="Open Action Items"
        />
        <StatCard
          icon={Brain}
          iconBg="rgba(16,185,129,0.12)"
          iconColor="var(--color-accent)"
          value={memoriesCount}
          label="Memories Saved"
        />
        <StatCard
          icon={MessageSquare}
          iconBg="rgba(99,102,241,0.12)"
          iconColor="var(--color-brand-light)"
          value={conversations?.length || 0}
          label="Conversations"
        />
      </div>

      {/* Triage Summary Card */}
      {triageSummary && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-primary">Email Triage</h3>
            <Link to="/triage" className="text-xs text-brand hover:underline">View all</Link>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1 text-center p-3 bg-danger/10 border border-danger/20 rounded-lg">
              <div className="text-2xl font-bold text-danger">{triageSummary.urgent}</div>
              <div className="text-xs text-muted">Urgent</div>
            </div>
            <div className="flex-1 text-center p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="text-2xl font-bold text-warning">{triageSummary.important}</div>
              <div className="text-xs text-muted">Important</div>
            </div>
            <div className="flex-1 text-center p-3 bg-brand/10 border border-brand/20 rounded-lg">
              <div className="text-2xl font-bold text-brand">{triageSummary.requiresReply}</div>
              <div className="text-xs text-muted">Need Reply</div>
            </div>
          </div>
          
          {emails.filter(e => e.priority === 'URGENT' && !e.isActedOn).slice(0, 1).map(topUrgentEmail => (
            <div key={topUrgentEmail.id} className="mt-4 p-3 bg-surface-2 rounded-lg border-l-2 border-danger">
              <p className="text-xs text-danger font-medium">URGENT</p>
              <p className="text-sm font-medium text-primary mt-1 truncate">{topUrgentEmail.subject}</p>
              <p className="text-xs text-muted truncate">{topUrgentEmail.from}</p>
            </div>
          ))}
        </Card>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button
          variant="primary"
          leftIcon={<MessageSquare size={14} />}
          onClick={() => navigate('/chat')}
        >
          Start a conversation
        </Button>
        <Button
          variant="secondary"
          leftIcon={<Globe size={14} />}
          onClick={() => navigate('/workspaces')}
        >
          Connect workspace
        </Button>
        <Button
          variant="ghost"
          leftIcon={<CheckSquare size={14} />}
          onClick={() => navigate('/actions')}
        >
          View action items
        </Button>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Conversations */}
        <Card padding="none">
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h3
              style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}
            >
              Recent Conversations
            </h3>
            <Link
              to="/chat"
              style={{ fontSize: '12px', color: 'var(--color-brand-light)', textDecoration: 'none' }}
            >
              View all
            </Link>
          </div>

          {conversations && conversations.length > 0 ? (
            <div>
              {conversations.slice(0, 5).map((conv) => (
                <Link
                  key={conv.id}
                  to="/chat"
                  className="flex items-center gap-3 px-6 py-3 transition-colors duration-150"
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background =
                      'var(--color-surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                    style={{
                      width: '32px',
                      height: '32px',
                      background: 'var(--color-brand-dim)',
                      color: 'var(--color-brand-light)',
                    }}
                  >
                    A7
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate"
                      style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}
                    >
                      {conv.title || 'New Conversation'}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      2 hours ago
                    </p>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div
                className="flex items-center justify-center rounded-full mb-4"
                style={{ width: '48px', height: '48px', background: 'var(--color-surface-2)' }}
              >
                <MessageSquare size={20} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                No conversations yet
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                Start chatting with Agent Seven
              </p>
              <Button variant="primary" size="sm" onClick={() => navigate('/chat')}>
                Start chatting
              </Button>
            </div>
          )}
        </Card>

        {/* Open Action Items */}
        <Card padding="none">
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h3
              style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}
            >
              Action Items
            </h3>
            <Badge variant="warning">{actionItems.length} open</Badge>
          </div>

          <div>
            {actionItems.length === 0 ? (
              <div className="py-8 px-6 text-center text-sm text-[var(--color-text-muted)]">
                No open action items.
              </div>
            ) : (
              actionItems.slice(0, 5).map((item: any, i: number) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-6 py-4 transition-colors duration-150"
                  style={{
                    borderBottom:
                      i < Math.min(actionItems.length, 5) - 1
                        ? '1px solid var(--color-border)'
                        : 'none',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      'var(--color-surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  <div
                    className="rounded flex-shrink-0 mt-0.5"
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-2)',
                      cursor: 'pointer',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.4 }}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {item.dueAt && (
                        <span
                          className="flex items-center gap-1"
                          style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
                        >
                          <Clock size={10} />
                          {new Date(item.dueAt).toLocaleDateString()}
                        </span>
                      )}
                      <Badge variant={item.status === 'OPEN' ? 'warning' : 'default'}>
                        {item.status ? item.status.replace('_', ' ') : 'OPEN'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Agent Status card */}
      <Card padding="none">
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6"
        >
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: '48px',
                height: '48px',
                background: 'var(--color-accent-dim)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <Zap size={20} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}
                >
                  Agent Seven
                </h3>
                <Badge variant="success">IDLE</Badge>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Last active 2 minutes ago · 14 tasks completed today
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="secondary" size="sm" leftIcon={<Plus size={13} />} onClick={() => navigate('/agent')}>
              Configure
            </Button>
            <Button variant="primary" size="sm" leftIcon={<MessageSquare size={13} />} onClick={() => navigate('/chat')}>
              Chat now
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
