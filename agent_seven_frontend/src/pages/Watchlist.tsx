import React, { useState } from 'react';
import { useWatchlist } from '../hooks/useTriage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Plus, Bell, Trash2, CheckCircle2, MessageSquare, Mail, Globe, Hash, Eye, Search, Sparkles } from 'lucide-react';
import { WatchlistItemInput } from '../services/triage.service';

/* ─── helpers ─── */
const getTypeIcon = (type: string) => {
  switch (type) {
    case 'EMAIL_ADDRESS': return <Mail size={18} style={{ color: '#60a5fa' }} />;
    case 'EMAIL_DOMAIN':  return <Globe size={18} style={{ color: '#818cf8' }} />;
    case 'KEYWORD':       return <Hash size={18} style={{ color: '#c084fc' }} />;
    case 'SLACK_USER':    return <MessageSquare size={18} style={{ color: '#34d399' }} />;
    default:              return <Eye size={18} style={{ color: 'var(--color-text-muted)' }} />;
  }
};

const alertBadgeVariant = (level: string): 'error' | 'warning' | 'info' | 'default' => {
  switch (level) {
    case 'CRITICAL': return 'error';
    case 'HIGH':     return 'warning';
    case 'NORMAL':   return 'info';
    default:         return 'default';
  }
};

const alertBarColor = (level: string, active: boolean) => {
  if (!active) return 'var(--color-text-muted)';
  switch (level) {
    case 'CRITICAL': return 'var(--color-danger)';
    case 'HIGH':     return 'var(--color-warning)';
    case 'NORMAL':   return 'var(--color-brand)';
    default:         return 'var(--color-accent)';
  }
};

/* ─── shared input style ─── */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  color: 'var(--color-text-primary)',
  fontSize: 13,
  outline: 'none',
};

/* ─── component ─── */
export function Watchlist() {
  const { items, alerts, unreadCount, loading, addItem, deleteItem, markRead, markAllRead } = useWatchlist();

  const [modalOpen, setModalOpen]   = useState(false);
  const [formType, setFormType]     = useState<string | null>(null);
  const [formData, setFormData]     = useState<WatchlistItemInput>({
    type: 'EMAIL_ADDRESS',
    value: '',
    label: '',
    description: '',
    alertLevel: 'NORMAL',
    notifyOnEmail: true,
    notifyOnSlack: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addItem({ ...formData, type: formType as any });
      setModalOpen(false);
      setFormType(null);
      setFormData({ type: 'EMAIL_ADDRESS', value: '', label: '', description: '', alertLevel: 'NORMAL', notifyOnEmail: true, notifyOnSlack: true });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => { setModalOpen(false); setFormType(null); };

  const filteredItems = items.filter(item =>
    item.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.label && item.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  /* ── alert sensitivity pill styles ── */
  const levelPill = (level: string) => {
    const active = formData.alertLevel === level;
    const colors: Record<string, { bg: string; border: string; color: string }> = {
      LOW:      { bg: 'rgba(16,185,129,0.12)', border: 'var(--color-accent)',   color: 'var(--color-accent)' },
      NORMAL:   { bg: 'rgba(99,102,241,0.12)', border: 'var(--color-brand)',    color: 'var(--color-brand)' },
      HIGH:     { bg: 'rgba(245,158,11,0.12)', border: 'var(--color-warning)',  color: 'var(--color-warning)' },
      CRITICAL: { bg: 'rgba(239,68,68,0.12)',  border: 'var(--color-danger)',   color: 'var(--color-danger)' },
    };
    return {
      padding: '6px 4px',
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 8,
      border: `1px solid ${active ? colors[level].border : 'var(--color-border)'}`,
      background: active ? colors[level].bg : 'var(--color-surface-2)',
      color: active ? colors[level].color : 'var(--color-text-muted)',
      cursor: 'pointer',
      transition: 'all 0.15s',
    } as React.CSSProperties;
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', padding: '40px 48px', overflow: 'hidden' }}>

      {/* ── decorative blobs ── */}
      <div className="animate-blob" style={{ position:'absolute', top:0, left:'25%', width:384, height:384, background:'rgba(99,102,241,0.07)', borderRadius:'50%', filter:'blur(80px)', pointerEvents:'none' }} />
      <div className="animate-blob animation-delay-2000" style={{ position:'absolute', top:'25%', right:'25%', width:384, height:384, background:'rgba(168,85,247,0.07)', borderRadius:'50%', filter:'blur(80px)', pointerEvents:'none' }} />
      <div className="animate-blob animation-delay-4000" style={{ position:'absolute', bottom:-128, left:'50%', width:384, height:384, background:'rgba(59,130,246,0.07)', borderRadius:'50%', filter:'blur(80px)', pointerEvents:'none' }} />

      <div style={{ maxWidth: 1024, margin: '0 auto', position: 'relative', zIndex: 10 }} className="animate-fade-in">

        {/* ══ Header ══ */}
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-end', justifyContent:'space-between', gap: 24, marginBottom: 40 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 6 }}>
              <Eye size={28} style={{ color: 'var(--color-brand)' }} />
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', margin: 0 }}>
                Watchlist
              </h1>
            </div>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: 440, lineHeight: 1.6, margin: 0 }}>
              Monitor specific people, companies, and keywords across your channels. We'll alert you when matches are found.
            </p>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-muted)', pointerEvents:'none' }} />
              <input
                type="text"
                placeholder="Search watchlist..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, width: 220, paddingLeft: 34, borderRadius: 12 }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-brand)')}
                onBlur={e =>  (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} style={{ marginRight: 6 }} />
              Add Item
            </Button>
          </div>
        </div>

        {/* ══ Alerts ══ */}
        {alerts.length > 0 && (
          <div style={{ marginBottom: 40, background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.18)', borderRadius: 20, padding: 24 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 20 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                <div style={{ padding: 8, background:'rgba(245,158,11,0.12)', borderRadius: 10, color:'var(--color-warning)', display:'flex' }}>
                  <Bell size={20} className="animate-pulse" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-warning)' }}>Action Required</span>
                <Badge variant="warning">{unreadCount} New</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={markAllRead}>Mark all as read</Button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className="group"
                  style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', background:'var(--color-surface)', border:'1px solid rgba(245,158,11,0.12)', padding:'14px 16px', borderRadius: 14, transition:'all 0.2s' }}
                >
                  <div style={{ display:'flex', alignItems:'flex-start', gap: 12 }}>
                    <div style={{ marginTop: 2, color:'var(--color-warning)' }}>
                      {alert.source === 'email' ? <Mail size={16} /> : <MessageSquare size={16} />}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color:'var(--color-text-primary)', marginBottom: 4 }}>{alert.matchedValue}</p>
                      <p style={{ fontSize: 12, color:'var(--color-text-muted)', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{alert.context}</p>
                      <span style={{ display:'inline-block', marginTop: 6, fontSize: 11, color:'var(--color-text-muted)', background:'var(--color-surface-2)', padding:'2px 8px', borderRadius: 6 }}>
                        {new Date(alert.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => markRead(alert.id)}
                    title="Mark as read"
                    style={{ padding: 8, background:'transparent', border:'none', color:'var(--color-text-muted)', cursor:'pointer', borderRadius: 8, flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-brand)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                  >
                    <CheckCircle2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Item List / Empty / Loading ══ */}
        {loading ? (
          <div style={{ padding: '80px 0', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <Eye size={40} className="animate-pulse" style={{ color:'var(--color-brand)', opacity: 0.5 }} />
            <p style={{ marginTop: 16, fontSize: 13, color:'var(--color-text-muted)' }} className="animate-pulse">Loading your watchlist...</p>
          </div>
        ) : items.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'96px 24px', textAlign:'center', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius: 24 }}>
            <div style={{ position:'relative', marginBottom: 24 }}>
              <div style={{ position:'absolute', inset:0, background:'rgba(99,102,241,0.15)', filter:'blur(24px)', borderRadius:'50%' }} />
              <div style={{ position:'relative', width: 72, height: 72, borderRadius: 18, background:'var(--color-surface-2)', border:'1px solid var(--color-border)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--color-brand)' }}>
                <Sparkles size={30} />
              </div>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color:'var(--color-text-primary)', marginBottom: 8 }}>Nothing on your radar yet</h3>
            <p style={{ fontSize: 13, color:'var(--color-text-muted)', maxWidth: 360, lineHeight: 1.7, marginBottom: 28 }}>
              Add people, companies, or keywords to start monitoring your communications automatically.
            </p>
            <Button variant="primary" onClick={() => setModalOpen(true)}>Create your first alert</Button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap: 32 }}>
            {(['EMAIL_ADDRESS','EMAIL_DOMAIN','KEYWORD','SLACK_USER'] as const).map(typeGroup => {
              const groupItems = filteredItems.filter(i => i.type.includes(typeGroup.split('_')[0]));
              if (groupItems.length === 0) return null;

              const groupTitle =
                typeGroup.startsWith('EMAIL') ? 'Emails & Domains' :
                typeGroup === 'KEYWORD'       ? 'Keywords' :
                                                'Slack Users';

              return (
                <div key={typeGroup} className="animate-slide-up">
                  {/* section header */}
                  <div style={{ display:'flex', alignItems:'center', gap: 12, marginBottom: 16 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 700, color:'var(--color-text-muted)', letterSpacing:'0.12em', textTransform:'uppercase', margin: 0, whiteSpace:'nowrap' }}>
                      {groupTitle}
                    </h3>
                    <div style={{ height: 1, background:'var(--color-border)', flex: 1 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color:'var(--color-text-muted)', background:'var(--color-surface-2)', padding:'2px 10px', borderRadius: 20, border:'1px solid var(--color-border)', flexShrink: 0 }}>
                      {groupItems.length}
                    </span>
                  </div>

                  {/* cards grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                    {groupItems.map(item => (
                      <div
                        key={item.id}
                        style={{ position:'relative', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius: 16, overflow:'hidden', transition:'all 0.25s' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.4)';
                          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)';
                          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                        }}
                      >
                        {/* colour bar */}
                        <div style={{ position:'absolute', top:0, left:0, width:3, height:'100%', background: alertBarColor(item.alertLevel, item.isActive), borderRadius:'16px 0 0 16px' }} />

                        <div style={{ padding:'16px 16px 16px 20px' }}>
                          {/* top row: icon + label + badge */}
                          <div style={{ display:'flex', alignItems:'center', gap: 12, marginBottom: 12 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background:'var(--color-surface-2)', border:'1px solid var(--color-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>
                              {getTypeIcon(item.type)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color:'var(--color-text-primary)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={item.label || item.value}>
                                {item.label || item.value}
                              </p>
                              <Badge variant={alertBadgeVariant(item.alertLevel)} className="mt-1" style={{ fontSize: 10, padding:'1px 6px' }}>
                                {item.alertLevel}
                              </Badge>
                            </div>
                            {/* delete button */}
                            <button
                              onClick={() => deleteItem(item.id)}
                              title="Remove"
                              style={{ padding: 6, background:'transparent', border:'1px solid transparent', borderRadius: 8, color:'var(--color-text-muted)', cursor:'pointer', flexShrink:0, transition:'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.color='var(--color-danger)'; e.currentTarget.style.background='rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.25)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color='var(--color-text-muted)'; e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent'; }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* value pill */}
                          <div style={{ background:'var(--color-surface-2)', border:'1px solid var(--color-border)', borderRadius: 8, padding:'7px 10px', marginBottom: 12 }}>
                            <p style={{ fontSize: 11, fontFamily:'monospace', color:'var(--color-text-muted)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={item.value}>
                              {item.value}
                            </p>
                          </div>

                          {/* stats row */}
                          <div style={{ display:'flex', justifyContent:'space-between', paddingTop: 10, borderTop:'1px solid var(--color-border)' }}>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 2 }}>Matches</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color:'var(--color-text-primary)' }}>{item.matchCount}</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 2 }}>Last Seen</div>
                              <div style={{ fontSize: 12, fontWeight: 600, color:'var(--color-text-primary)' }}>
                                {item.lastMatchAt ? new Date(item.lastMatchAt).toLocaleDateString(undefined, { month:'short', day:'numeric' }) : 'Never'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ Add Modal ══ */}
        {modalOpen && (
          <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding: 16 }}>
            {/* backdrop */}
            <div
              onClick={closeModal}
              style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)' }}
            />
            {/* panel */}
            <div className="animate-slide-up" style={{ position:'relative', width:'100%', maxWidth: 480, background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius: 20, overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }}>

              {/* header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid var(--color-border)', background:'var(--color-surface-2)' }}>
                <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                  <div style={{ padding: 8, background:'rgba(99,102,241,0.12)', borderRadius: 10, color:'var(--color-brand)', display:'flex' }}>
                    {formType ? getTypeIcon(formType) : <Plus size={20} />}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color:'var(--color-text-primary)', margin: 0 }}>
                    {formType ? 'Configure Tracker' : 'What do you want to track?'}
                  </h3>
                </div>
                <button
                  onClick={closeModal}
                  style={{ padding: 8, background:'transparent', border:'none', color:'var(--color-text-muted)', cursor:'pointer', borderRadius: 10, fontSize: 16, lineHeight:1 }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                >
                  ✕
                </button>
              </div>

              {/* body */}
              <div style={{ padding: 24, maxHeight:'75vh', overflowY:'auto' }} className="custom-scrollbar">

                {!formType ? (
                  /* type picker grid */
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }}>
                    {[
                      { type:'EMAIL_ADDRESS', icon: Mail,         title:'Email Address', desc:'Watch emails from a specific person',  color:'#60a5fa', bg:'rgba(96,165,250,0.10)' },
                      { type:'EMAIL_DOMAIN',  icon: Globe,        title:'Domain',        desc:'Watch any email from a company',       color:'#818cf8', bg:'rgba(129,140,248,0.10)' },
                      { type:'KEYWORD',       icon: Hash,         title:'Keyword',       desc:'Track specific words or phrases',      color:'#c084fc', bg:'rgba(192,132,252,0.10)' },
                      { type:'SLACK_USER',    icon: MessageSquare,title:'Slack User',    desc:'Monitor a specific person in Slack',   color:'#34d399', bg:'rgba(52,211,153,0.10)' },
                    ].map(t => (
                      <button
                        key={t.type}
                        onClick={() => { setFormType(t.type); setFormData(d => ({ ...d, type: t.type as any })); }}
                        style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', padding: 18, border:'1px solid var(--color-border)', borderRadius: 16, background:'var(--color-surface-2)', cursor:'pointer', textAlign:'left', transition:'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                      >
                        <div style={{ padding: 10, background: t.bg, borderRadius: 12, color: t.color, display:'flex', marginBottom: 12 }}>
                          <t.icon size={22} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color:'var(--color-text-primary)', marginBottom: 4 }}>{t.title}</span>
                        <span style={{ fontSize: 12, color:'var(--color-text-muted)', lineHeight: 1.5 }}>{t.desc}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* config form */
                  <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap: 20 }}>

                    {/* value */}
                    <div>
                      <label style={{ display:'block', fontSize: 11, fontWeight: 700, color:'var(--color-text-primary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 8 }}>
                        Value to monitor
                      </label>
                      <input
                        type="text"
                        required
                        style={inputStyle}
                        placeholder={
                          formType === 'EMAIL_ADDRESS' ? 'e.g., vip@important.com' :
                          formType === 'EMAIL_DOMAIN'  ? 'e.g., bigcorp.com' :
                                                         'e.g., urgent payment'
                        }
                        value={formData.value}
                        onChange={e => setFormData(d => ({ ...d, value: e.target.value }))}
                        onFocus={e  => (e.currentTarget.style.borderColor = 'var(--color-brand)')}
                        onBlur={e   => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                      />
                    </div>

                    {/* label */}
                    <div>
                      <label style={{ display:'block', fontSize: 11, fontWeight: 700, color:'var(--color-text-primary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 8 }}>
                        Friendly Label <span style={{ fontWeight: 400, color:'var(--color-text-muted)', textTransform:'none' }}>(optional)</span>
                      </label>
                      <input
                        type="text"
                        style={inputStyle}
                        placeholder="e.g., Top Client"
                        value={formData.label || ''}
                        onChange={e => setFormData(d => ({ ...d, label: e.target.value }))}
                        onFocus={e  => (e.currentTarget.style.borderColor = 'var(--color-brand)')}
                        onBlur={e   => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                      />
                    </div>

                    {/* alert sensitivity */}
                    <div>
                      <label style={{ display:'block', fontSize: 11, fontWeight: 700, color:'var(--color-text-primary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 8 }}>
                        Alert Sensitivity
                      </label>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: 8 }}>
                        {(['LOW','NORMAL','HIGH','CRITICAL'] as const).map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setFormData(d => ({ ...d, alertLevel: level }))}
                            style={levelPill(level)}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* notification channels */}
                    <div style={{ background:'var(--color-surface-2)', border:'1px solid var(--color-border)', borderRadius: 14, padding: 16 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color:'var(--color-text-primary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 14 }}>
                        Notification Channels
                      </p>

                      {/* email toggle */}
                      <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', marginBottom: 12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                          <div style={{ padding: 8, borderRadius: 10, background: formData.notifyOnEmail ? 'rgba(99,102,241,0.12)' : 'var(--color-surface)', color: formData.notifyOnEmail ? 'var(--color-brand)' : 'var(--color-text-muted)', display:'flex' }}>
                            <Mail size={16} />
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color:'var(--color-text-primary)', margin:0 }}>Email Notifications</p>
                            <p style={{ fontSize: 11, color:'var(--color-text-muted)', margin:0 }}>Get alerts in your inbox</p>
                          </div>
                        </div>
                        <input type="checkbox" checked={formData.notifyOnEmail} onChange={e => setFormData(d => ({ ...d, notifyOnEmail: e.target.checked }))} style={{ width: 16, height: 16, accentColor:'var(--color-brand)', cursor:'pointer' }} />
                      </label>

                      <div style={{ height: 1, background:'var(--color-border)', margin:'12px 0' }} />

                      {/* slack toggle */}
                      <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
                        <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                          <div style={{ padding: 8, borderRadius: 10, background: formData.notifyOnSlack ? 'rgba(99,102,241,0.12)' : 'var(--color-surface)', color: formData.notifyOnSlack ? 'var(--color-brand)' : 'var(--color-text-muted)', display:'flex' }}>
                            <MessageSquare size={16} />
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color:'var(--color-text-primary)', margin:0 }}>Slack Alerts</p>
                            <p style={{ fontSize: 11, color:'var(--color-text-muted)', margin:0 }}>Direct message to you</p>
                          </div>
                        </div>
                        <input type="checkbox" checked={formData.notifyOnSlack} onChange={e => setFormData(d => ({ ...d, notifyOnSlack: e.target.checked }))} style={{ width: 16, height: 16, accentColor:'var(--color-brand)', cursor:'pointer' }} />
                      </label>
                    </div>

                    {/* actions */}
                    <div style={{ display:'flex', justifyContent:'flex-end', gap: 10, paddingTop: 4 }}>
                      <Button variant="ghost" type="button" onClick={() => setFormType(null)}>Back</Button>
                      <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving…' : 'Start Tracking'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
