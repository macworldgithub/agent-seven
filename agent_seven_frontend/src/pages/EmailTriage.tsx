import React, { useState } from 'react';
import { useTriage } from '../hooks/useTriage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { RefreshCw, Inbox, AlertTriangle, AlertCircle, Info, Mail, CheckCircle, Clock } from 'lucide-react';
import { triageService, ClassifiedEmail } from '../services/triage.service';

export function EmailTriage() {
  const [filter, setFilter] = useState<'ALL' | 'URGENT' | 'IMPORTANT' | 'NEEDS_REPLY' | 'ACTED'>('ALL');
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<ClassifiedEmail | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const filters = React.useMemo(() => {
    const f: any = {};
    if (filter === 'URGENT') f.priority = 'URGENT';
    if (filter === 'IMPORTANT') f.priority = 'IMPORTANT';
    if (filter === 'NEEDS_REPLY') f.requiresReply = true;
    if (filter === 'ACTED') f.isActedOn = true;
    if (filter !== 'ACTED') f.isActedOn = false;
    return f;
  }, [filter]);

  const { emails, summary, loading, triggerTriage, markActedOn, refresh } = useTriage(filters);

  const handleTriggerTriage = async () => {
    if (triggering) return;
    setTriggering(true);
    setCountdown(30);

    try {
      await triggerTriage();
    } catch (err) {
      console.error('Failed to trigger triage:', err);
      setTriggering(false);
      setCountdown(0);
      return;
    }

    // Start countdown interval
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          // Refresh data when countdown hits 0
          refresh().finally(() => setTriggering(false));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleDraftReply = async (email: ClassifiedEmail) => {
    setCurrentEmail(email);
    setDraftModalOpen(true);
    setIsDrafting(true);
    try {
      const draft = await triageService.generateReplyDraft(email.id);
      setDraftContent(draft);
    } catch (err) {
      console.error(err);
      setDraftContent('Failed to generate draft.');
    } finally {
      setIsDrafting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'var(--color-danger)';
      case 'IMPORTANT': return 'var(--color-warning)';
      case 'NORMAL': return 'var(--color-accent)';
      case 'LOW': return 'var(--color-text-muted)';
      default: return 'var(--color-border)';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT': return <AlertTriangle size={16} />;
      case 'IMPORTANT': return <AlertCircle size={16} />;
      case 'NORMAL': return <Info size={16} />;
      default: return <Mail size={16} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1">Email Triage</h1>
          <p className="text-sm text-muted">AI-classified emails across your workspaces</p>
        </div>
        <div className="flex items-center gap-3">
          {triggering ? (
            <span className="text-xs text-brand font-medium animate-pulse">
              🔄 Classifying emails... refreshing in {countdown}s
            </span>
          ) : (
            <span className="text-xs text-muted">Click below to classify your inbox</span>
          )}
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={14} className={triggering ? 'animate-spin' : ''} />}
            onClick={handleTriggerTriage}
            disabled={triggering}
          >
            {triggering ? `Refreshing in ${countdown}s` : 'Run Triage'}
          </Button>
        </div>
      </div>

      {/* Countdown banner */}
      {triggering && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-brand/30 bg-brand/5 flex items-center gap-3">
          <RefreshCw size={16} className="text-brand animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-brand">Email triage in progress</p>
            <p className="text-xs text-muted">Fetching and classifying your emails with AI. Results will appear in <strong>{countdown}s</strong>.</p>
          </div>
        </div>
      )}

      {/* Summary Stats Row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-danger/10 border-danger/20 p-4">
            <div className="flex items-center gap-2 mb-2 text-danger">
              <AlertTriangle size={16} />
              <span className="text-xs font-semibold">URGENT</span>
            </div>
            <div className="text-2xl font-bold text-danger">{summary.urgent}</div>
          </Card>
          <Card className="bg-warning/10 border-warning/20 p-4">
            <div className="flex items-center gap-2 mb-2 text-warning">
              <AlertCircle size={16} />
              <span className="text-xs font-semibold">IMPORTANT</span>
            </div>
            <div className="text-2xl font-bold text-warning">{summary.important}</div>
          </Card>
          <Card className="bg-accent/10 border-accent/20 p-4">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Info size={16} />
              <span className="text-xs font-semibold">NORMAL</span>
            </div>
            <div className="text-2xl font-bold text-accent">{summary.normal}</div>
          </Card>
          <Card className="bg-surface-3 p-4">
            <div className="flex items-center gap-2 mb-2 text-muted">
              <Mail size={16} />
              <span className="text-xs font-semibold">LOW</span>
            </div>
            <div className="text-2xl font-bold text-muted">{summary.low}</div>
          </Card>
          <Card className="bg-brand/10 border-brand/20 p-4">
            <div className="flex items-center gap-2 mb-2 text-brand">
              <RefreshCw size={16} />
              <span className="text-xs font-semibold">Needs Reply</span>
            </div>
            <div className="text-2xl font-bold text-brand">{summary.requiresReply}</div>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-1 border-b border-border mb-6">
        {['ALL', 'URGENT', 'IMPORTANT', 'NEEDS_REPLY', 'ACTED'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Email List */}
      {loading ? (
        <div className="py-12 flex justify-center text-muted"><RefreshCw className="animate-spin" /></div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-surface border border-border rounded-xl">
          <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-4 text-muted">
            <Inbox size={24} />
          </div>
          <p className="text-base text-primary mb-1">No classified emails yet</p>
          <p className="text-sm text-muted mb-1">The Email Classification table is empty.</p>
          <p className="text-sm text-muted mb-5">Click <strong>Run Triage</strong> to fetch your inbox and classify emails with AI. Results appear in ~30 seconds.</p>
          <Button
            variant="primary"
            leftIcon={<RefreshCw size={14} className={triggering ? 'animate-spin' : ''} />}
            onClick={handleTriggerTriage}
            disabled={triggering}
          >
            {triggering ? `Classifying... ${countdown}s` : 'Run Triage Now'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {emails.map((email) => (
            <div 
              key={email.id} 
              className={`bg-surface border border-border rounded-xl p-5 transition-all ${email.isActedOn ? 'opacity-60' : ''}`}
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* Left */}
                <div className="flex-shrink-0 flex md:flex-col items-center md:items-start gap-2 w-32">
                  <div 
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide"
                    style={{ backgroundColor: `${getPriorityColor(email.priority)}20`, color: getPriorityColor(email.priority) }}
                  >
                    {getPriorityIcon(email.priority)}
                    {email.priority}
                  </div>
                  <Badge variant="default" className="text-[10px]">{email.intent.replace('_', ' ')}</Badge>
                </div>
                
                {/* Center */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary mb-1">{email.from}</p>
                  <p className="text-base font-semibold text-primary truncate mb-1">{email.subject}</p>
                  {email.summary && (
                    <p className="text-sm text-muted line-clamp-2 leading-relaxed bg-surface-2 p-2 rounded-md mb-2">
                      <span className="font-semibold text-brand mr-2">AI Summary:</span>{email.summary}
                    </p>
                  )}
                  {email.hasDeadline && email.deadlineText && (
                    <p className="text-xs text-warning flex items-center gap-1 font-medium">
                      <Clock size={12} /> Deadline: {email.deadlineText}
                    </p>
                  )}
                </div>

                {/* Right */}
                <div className="flex-shrink-0 flex flex-row md:flex-col items-center md:items-end gap-2 text-right">
                  <div className="flex items-center gap-1 font-mono text-sm text-muted">
                    Score: <span className="font-semibold text-primary">{email.score}</span>/100
                  </div>
                  {email.requiresReply && !email.isActedOn && (
                    <Badge variant="warning">Reply Needed</Badge>
                  )}
                  {email.isActedOn && (
                    <Badge variant="success"><CheckCircle size={12} className="mr-1" /> Acted On</Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-border mt-4 pt-3 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                  {!email.isActedOn && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => handleDraftReply(email)}>
                        Draft Reply
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => markActedOn(email.id)}>
                        Mark Done
                      </Button>
                    </>
                  )}
                </div>
                <a 
                  href={`https://mail.google.com/mail/u/0/#all/${email.threadId}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-brand hover:underline font-medium"
                >
                  Open in Gmail →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Draft Modal */}
      {draftModalOpen && currentEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold text-primary">Drafting Reply</h3>
              <button onClick={() => setDraftModalOpen(false)} className="text-muted hover:text-primary">✕</button>
            </div>
            <div className="p-5">
              <div className="mb-4 bg-surface-2 p-3 rounded-lg border border-border">
                <p className="text-xs text-muted mb-1">Replying to:</p>
                <p className="text-sm font-medium">{currentEmail.from}</p>
                <p className="text-sm truncate">{currentEmail.subject}</p>
              </div>
              
              {isDrafting ? (
                <div className="flex flex-col items-center py-8">
                  <RefreshCw className="animate-spin text-brand mb-4" size={24} />
                  <p className="text-sm text-muted">Agent Seven is drafting a response...</p>
                </div>
              ) : (
                <textarea 
                  className="w-full h-48 p-3 bg-background border border-border rounded-lg text-sm text-primary resize-none focus:outline-none focus:border-brand transition-colors"
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                />
              )}
            </div>
            <div className="p-5 border-t border-border flex justify-between bg-surface-2">
              <Button variant="ghost" onClick={() => setDraftModalOpen(false)}>Cancel</Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigator.clipboard.writeText(draftContent)} disabled={isDrafting}>
                  Copy
                </Button>
                <Button variant="primary" disabled={isDrafting}>
                  <a href={`https://mail.google.com/mail/u/0/#all/${currentEmail.threadId}`} target="_blank" rel="noreferrer" className="text-white">
                    Open Gmail to Send
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
