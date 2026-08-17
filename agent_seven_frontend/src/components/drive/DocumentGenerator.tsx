import React, { useState, useCallback } from 'react';
import {
  X,
  FileText,
  Receipt,
  ClipboardList,
  BarChart3,
  ScrollText,
  FilePlus2,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { driveService, GeneratedDocument } from '../../services/drive.service';

// ─── Types ─────────────────────────────────────────────────────────────────────

type DocType = 'proposal' | 'invoice' | 'meeting_notes' | 'report' | 'sow' | 'blank';

interface TemplateCard {
  type: DocType;
  icon: React.FC<any>;
  label: string;
  description: string;
  color: string;
  bg: string;
}

const TEMPLATES: TemplateCard[] = [
  {
    type: 'proposal',
    icon: FileText,
    label: 'Proposal',
    description: 'Client proposals and quotes',
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.12)',
  },
  {
    type: 'invoice',
    icon: Receipt,
    label: 'Invoice',
    description: 'Professional invoices with GST',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
  },
  {
    type: 'meeting_notes',
    icon: ClipboardList,
    label: 'Meeting Notes',
    description: 'Capture decisions and action items',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
  },
  {
    type: 'report',
    icon: BarChart3,
    label: 'Report',
    description: 'Business reports and analysis',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
  },
  {
    type: 'sow',
    icon: ScrollText,
    label: 'Statement of Work',
    description: 'SOW contracts and deliverables',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
  },
  {
    type: 'blank',
    icon: FilePlus2,
    label: 'Blank Document',
    description: 'Start from scratch',
    color: 'var(--color-text-muted)',
    bg: 'var(--color-surface-3)',
  },
];

// ─── Sub-forms ─────────────────────────────────────────────────────────────────

interface LineItem {
  description: string;
  qty: number;
  rate: number;
}

interface ActionItemRow {
  task: string;
  owner: string;
  dueDate: string;
}

// Shared input style
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  color: 'var(--color-text-primary)',
  fontSize: '13px',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ─── Proposal Form ─────────────────────────────────────────────────────────────

function ProposalForm({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Client / Company Name *">
          <input
            style={inputStyle}
            placeholder="Acme Corp"
            value={data.clientName || ''}
            onChange={(e) => onChange({ ...data, clientName: e.target.value })}
          />
        </FormField>
        <FormField label="Your Business Name *">
          <input
            style={inputStyle}
            placeholder="My Business Pty Ltd"
            value={data.businessName || ''}
            onChange={(e) => onChange({ ...data, businessName: e.target.value })}
          />
        </FormField>
      </div>
      <FormField label="Executive Summary">
        <textarea
          style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
          placeholder="Brief overview of what you're proposing..."
          value={data.executiveSummary || ''}
          onChange={(e) => onChange({ ...data, executiveSummary: e.target.value })}
        />
      </FormField>
      <FormField label="Scope of Work">
        <textarea
          style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
          placeholder="List the key deliverables and services..."
          value={data.scopeOfWork || ''}
          onChange={(e) => onChange({ ...data, scopeOfWork: e.target.value })}
        />
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Project Value (AUD)">
          <input
            style={inputStyle}
            type="number"
            placeholder="e.g. 15000"
            value={data.totalValue || ''}
            onChange={(e) => onChange({ ...data, totalValue: e.target.value })}
          />
        </FormField>
        <FormField label="Timeline">
          <input
            style={inputStyle}
            placeholder="e.g. 6–8 weeks"
            value={data.timeline || ''}
            onChange={(e) => onChange({ ...data, timeline: e.target.value })}
          />
        </FormField>
      </div>
    </div>
  );
}

// ─── Invoice Form ─────────────────────────────────────────────────────────────

function InvoiceForm({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const lineItems: LineItem[] = data.lineItems || [{ description: '', qty: 1, rate: 0 }];

  const updateItem = (idx: number, field: keyof LineItem, value: any) => {
    const updated = lineItems.map((item, i) =>
      i === idx ? { ...item, [field]: field === 'description' ? value : Number(value) } : item
    );
    onChange({ ...data, lineItems: updated });
  };

  const addItem = () => onChange({ ...data, lineItems: [...lineItems, { description: '', qty: 1, rate: 0 }] });
  const removeItem = (idx: number) =>
    onChange({ ...data, lineItems: lineItems.filter((_, i) => i !== idx) });

  const subtotal = lineItems.reduce((s, i) => s + i.qty * i.rate, 0);
  const gst = subtotal * 0.1;
  const total = subtotal + gst;
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Client Name *">
          <input
            style={inputStyle}
            value={data.clientName || ''}
            onChange={(e) => onChange({ ...data, clientName: e.target.value })}
            placeholder="Acme Corp"
          />
        </FormField>
        <FormField label="Invoice Number">
          <input
            style={inputStyle}
            value={data.invoiceNumber || ''}
            onChange={(e) => onChange({ ...data, invoiceNumber: e.target.value })}
            placeholder="INV-001"
          />
        </FormField>
        <FormField label="Due Date">
          <input
            type="date"
            style={inputStyle}
            value={data.dueDate || ''}
            onChange={(e) => onChange({ ...data, dueDate: e.target.value })}
          />
        </FormField>
        <FormField label="ABN">
          <input
            style={inputStyle}
            value={data.abn || ''}
            onChange={(e) => onChange({ ...data, abn: e.target.value })}
            placeholder="12 345 678 901"
          />
        </FormField>
      </div>

      {/* Line Items */}
      <div>
        <label style={labelStyle}>Line Items</label>
        <div className="space-y-2">
          {lineItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                style={{ ...inputStyle, flex: 3 }}
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(idx, 'description', e.target.value)}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                type="number"
                placeholder="Qty"
                value={item.qty}
                onChange={(e) => updateItem(idx, 'qty', e.target.value)}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                type="number"
                placeholder="Rate"
                value={item.rate}
                onChange={(e) => updateItem(idx, 'rate', e.target.value)}
              />
              <span
                style={{ ...inputStyle, flex: 1, color: 'var(--color-text-muted)', textAlign: 'right' }}
              >
                {fmt(item.qty * item.rate)}
              </span>
              {lineItems.length > 1 && (
                <button
                  onClick={() => removeItem(idx)}
                  style={{ color: 'var(--color-danger)', flexShrink: 0 }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 mt-2 text-xs font-medium"
          style={{ color: 'var(--color-brand-light)' }}
        >
          <Plus size={13} /> Add Line Item
        </button>
      </div>

      {/* Totals */}
      <div
        className="rounded-xl p-4 space-y-1.5 text-sm"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex justify-between" style={{ color: 'var(--color-text-muted)' }}>
          <span>Subtotal</span><span>{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between" style={{ color: 'var(--color-text-muted)' }}>
          <span>GST (10%)</span><span>{fmt(gst)}</span>
        </div>
        <div
          className="flex justify-between font-semibold pt-1.5"
          style={{
            color: 'var(--color-text-primary)',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '6px',
          }}
        >
          <span>Total Due</span><span>{fmt(total)}</span>
        </div>
      </div>

      {/* Bank details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField label="Bank Name">
          <input
            style={inputStyle}
            value={data.bankName || ''}
            onChange={(e) => onChange({ ...data, bankName: e.target.value })}
            placeholder="Commonwealth Bank"
          />
        </FormField>
        <FormField label="BSB">
          <input
            style={inputStyle}
            value={data.bsb || ''}
            onChange={(e) => onChange({ ...data, bsb: e.target.value })}
            placeholder="062-000"
          />
        </FormField>
        <FormField label="Account Number">
          <input
            style={inputStyle}
            value={data.accountNumber || ''}
            onChange={(e) => onChange({ ...data, accountNumber: e.target.value })}
            placeholder="12345678"
          />
        </FormField>
      </div>
    </div>
  );
}

// ─── Meeting Notes Form ─────────────────────────────────────────────────────────

function MeetingNotesForm({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const actionItems: ActionItemRow[] = data.actionItems || [];

  const addAction = () =>
    onChange({ ...data, actionItems: [...actionItems, { task: '', owner: '', dueDate: '' }] });

  const updateAction = (idx: number, field: keyof ActionItemRow, value: string) => {
    const updated = actionItems.map((a, i) => (i === idx ? { ...a, [field]: value } : a));
    onChange({ ...data, actionItems: updated });
  };

  const removeAction = (idx: number) =>
    onChange({ ...data, actionItems: actionItems.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Meeting Date">
          <input
            type="date"
            style={inputStyle}
            value={data.date || new Date().toISOString().slice(0, 10)}
            onChange={(e) => onChange({ ...data, date: e.target.value })}
          />
        </FormField>
        <FormField label="Attendees (comma-separated)">
          <input
            style={inputStyle}
            placeholder="Alice, Bob, Carol"
            value={data.attendees || ''}
            onChange={(e) => onChange({ ...data, attendees: e.target.value })}
          />
        </FormField>
      </div>
      <FormField label="Agenda Items">
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          placeholder="1. Budget review\n2. Project updates"
          value={data.agendaItems || ''}
          onChange={(e) => onChange({ ...data, agendaItems: e.target.value })}
        />
      </FormField>
      <FormField label="Discussion Points">
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          placeholder="Key discussion points..."
          value={data.discussionPoints || ''}
          onChange={(e) => onChange({ ...data, discussionPoints: e.target.value })}
        />
      </FormField>
      <FormField label="Decisions Made">
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          placeholder="List decisions..."
          value={data.decisions || ''}
          onChange={(e) => onChange({ ...data, decisions: e.target.value })}
        />
      </FormField>

      {/* Action Items */}
      <div>
        <label style={labelStyle}>Action Items</label>
        <div className="space-y-2">
          {actionItems.map((a, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                style={{ ...inputStyle, flex: 3 }}
                placeholder="Task"
                value={a.task}
                onChange={(e) => updateAction(idx, 'task', e.target.value)}
              />
              <input
                style={{ ...inputStyle, flex: 2 }}
                placeholder="Owner"
                value={a.owner}
                onChange={(e) => updateAction(idx, 'owner', e.target.value)}
              />
              <input
                type="date"
                style={{ ...inputStyle, flex: 2 }}
                value={a.dueDate}
                onChange={(e) => updateAction(idx, 'dueDate', e.target.value)}
              />
              <button onClick={() => removeAction(idx)} style={{ color: 'var(--color-danger)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addAction}
          className="flex items-center gap-1.5 mt-2 text-xs font-medium"
          style={{ color: 'var(--color-brand-light)' }}
        >
          <Plus size={13} /> Add Action Item
        </button>
      </div>

      <FormField label="Next Meeting">
        <input
          style={inputStyle}
          placeholder="e.g. Monday 18 August, 10am AEST"
          value={data.nextMeeting || ''}
          onChange={(e) => onChange({ ...data, nextMeeting: e.target.value })}
        />
      </FormField>
    </div>
  );
}

// ─── Report Form ────────────────────────────────────────────────────────────────

function ReportForm({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <FormField label="Executive Summary">
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={data.executiveSummary || ''}
          onChange={(e) => onChange({ ...data, executiveSummary: e.target.value })}
          placeholder="Brief overview of the report..."
        />
      </FormField>
      <FormField label="Key Findings">
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={data.keyFindings || ''}
          onChange={(e) => onChange({ ...data, keyFindings: e.target.value })}
          placeholder="1. Finding one\n2. Finding two"
        />
      </FormField>
      <FormField label="Analysis">
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={data.analysis || ''}
          onChange={(e) => onChange({ ...data, analysis: e.target.value })}
          placeholder="Detailed analysis..."
        />
      </FormField>
      <FormField label="Recommendations">
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={data.recommendations || ''}
          onChange={(e) => onChange({ ...data, recommendations: e.target.value })}
          placeholder="Recommended actions..."
        />
      </FormField>
    </div>
  );
}

// ─── SOW Form ───────────────────────────────────────────────────────────────────

function SowForm({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <FormField label="Client Name *">
        <input
          style={inputStyle}
          value={data.clientName || ''}
          onChange={(e) => onChange({ ...data, clientName: e.target.value })}
          placeholder="Acme Corp"
        />
      </FormField>
      <FormField label="Project Overview">
        <textarea
          style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
          value={data.overview || ''}
          onChange={(e) => onChange({ ...data, overview: e.target.value })}
          placeholder="High-level project description..."
        />
      </FormField>
      <FormField label="Deliverables">
        <textarea
          style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
          value={data.deliverables || ''}
          onChange={(e) => onChange({ ...data, deliverables: e.target.value })}
          placeholder="1. Deliverable one\n2. Deliverable two"
        />
      </FormField>
      <FormField label="Timeline & Milestones">
        <textarea
          style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
          value={data.milestones || ''}
          onChange={(e) => onChange({ ...data, milestones: e.target.value })}
          placeholder="Week 1: Discovery\nWeek 2–4: Development..."
        />
      </FormField>
      <FormField label="Assumptions & Exclusions">
        <textarea
          style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
          value={data.assumptions || ''}
          onChange={(e) => onChange({ ...data, assumptions: e.target.value })}
          placeholder="This SOW assumes..."
        />
      </FormField>
      <FormField label="Acceptance Criteria">
        <textarea
          style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
          value={data.acceptanceCriteria || ''}
          onChange={(e) => onChange({ ...data, acceptanceCriteria: e.target.value })}
          placeholder="Work is accepted when..."
        />
      </FormField>
    </div>
  );
}

// ─── Main DocumentGenerator ─────────────────────────────────────────────────────

interface DocumentGeneratorProps {
  workspaceId: string;
  onClose: () => void;
  defaultType?: DocType;
}

export function DocumentGenerator({ workspaceId, onClose, defaultType }: DocumentGeneratorProps) {
  const [step, setStep] = useState<1 | 2 | 3>(defaultType ? 2 : 1);
  const [selectedType, setSelectedType] = useState<DocType>(defaultType || 'proposal');
  const [title, setTitle] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = TEMPLATES.find((t) => t.type === selectedType)!;

  const handleGenerate = useCallback(async () => {
    if (!title.trim()) {
      setError('Please enter a document title.');
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      if (selectedType === 'blank') {
        const doc = await driveService.createDocument(workspaceId, title, '');
        setResult(doc);
      } else {
        const doc = await driveService.generateDocument(workspaceId, selectedType, title, formData);
        setResult(doc);
      }
      setStep(3);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to generate document.');
    } finally {
      setGenerating(false);
    }
  }, [workspaceId, selectedType, title, formData]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              New Document
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div
                    className="flex items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      width: 22,
                      height: 22,
                      background: step >= s ? 'var(--color-brand)' : 'var(--color-surface-3)',
                      color: step >= s ? 'white' : 'var(--color-text-muted)',
                      fontSize: '11px',
                    }}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div
                      style={{
                        width: 24,
                        height: 2,
                        borderRadius: 1,
                        background: step > s ? 'var(--color-brand)' : 'var(--color-border)',
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
              <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>
                {step === 1 ? 'Choose template' : step === 2 ? 'Fill details' : 'Done'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg p-1.5 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)';
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Step 1: Choose template */}
          {step === 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = selectedType === tmpl.type;
                return (
                  <button
                    key={tmpl.type}
                    onClick={() => { setSelectedType(tmpl.type); }}
                    className="flex flex-col items-start gap-3 rounded-xl p-4 text-left transition-all duration-150"
                    style={{
                      background: isSelected ? 'var(--color-surface-2)' : 'var(--color-surface)',
                      border: `1px solid ${isSelected ? tmpl.color : 'var(--color-border)'}`,
                      boxShadow: isSelected ? `0 0 0 2px ${tmpl.color}33` : 'none',
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-lg"
                      style={{ width: 40, height: 40, background: tmpl.bg }}
                    >
                      <Icon size={20} style={{ color: tmpl.color }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {tmpl.label}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {tmpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Fill form */}
          {step === 2 && (
            <div className="space-y-4">
              <FormField label="Document Title *">
                <input
                  style={{ ...inputStyle, fontSize: '14px' }}
                  placeholder={`e.g. Proposal for Acme Corp`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </FormField>

              {/* Template badge */}
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 28, height: 28, background: selectedTemplate.bg }}
                >
                  <selectedTemplate.icon size={14} style={{ color: selectedTemplate.color }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                  {selectedTemplate.label}
                </span>
              </div>

              {/* Dynamic form */}
              {selectedType === 'proposal' && (
                <ProposalForm data={formData} onChange={setFormData} />
              )}
              {selectedType === 'invoice' && (
                <InvoiceForm data={formData} onChange={setFormData} />
              )}
              {selectedType === 'meeting_notes' && (
                <MeetingNotesForm data={formData} onChange={setFormData} />
              )}
              {selectedType === 'report' && (
                <ReportForm data={formData} onChange={setFormData} />
              )}
              {selectedType === 'sow' && (
                <SowForm data={formData} onChange={setFormData} />
              )}
              {selectedType === 'blank' && (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  A blank Google Doc will be created with your title. You can edit it in Google Docs.
                </p>
              )}

              {error && (
                <div
                  className="rounded-lg px-4 py-3 text-sm"
                  style={{ background: 'var(--color-danger-dim)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && result && (
            <div className="flex flex-col items-center text-center py-8 gap-4">
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 64, height: 64, background: 'rgba(16,185,129,0.12)' }}
              >
                <CheckCircle2 size={32} style={{ color: '#10B981' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Document Created!
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  {result.title}
                </p>
              </div>
              <a
                href={result.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-sm transition-all duration-150"
                style={{
                  background: 'var(--color-brand)',
                  color: 'white',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Open in Google Drive <ExternalLink size={14} />
              </a>
              <button
                onClick={onClose}
                style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 3 && (
          <div
            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <button
              onClick={() => {
                if (step === 2) setStep(1);
                else onClose();
              }}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
              style={{
                background: 'var(--color-surface-2)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <ChevronLeft size={14} />
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step === 1 ? (
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
                style={{ background: 'var(--color-brand)', color: 'white' }}
              >
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition-all duration-150"
                style={{
                  background: generating ? 'var(--color-surface-3)' : 'var(--color-brand)',
                  color: generating ? 'var(--color-text-muted)' : 'white',
                  cursor: generating ? 'not-allowed' : 'pointer',
                }}
              >
                {generating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>Generate in Drive</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
