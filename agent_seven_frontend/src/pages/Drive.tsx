import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderOpen,
  Cloud,
  Grid3X3,
  List,
  Search,
  ChevronRight,
  ChevronDown,
  FileText,
  ExternalLink,
  X,
  Plus,
  Upload,
  Clock,
  MessageSquare,
  Copy,
  Check,
  Loader2,
  Eye,
  ScanText,
  LayoutTemplate,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { workspaceService } from '../services/workspace.service';
import { driveService, DriveFile } from '../services/drive.service';
import { FileCard, getFileTypeInfo } from '../components/drive/FileCard';
import { DocumentGenerator } from '../components/drive/DocumentGenerator';
import { useNavigate } from 'react-router-dom';

// ─── File Preview Panel ─────────────────────────────────────────────────────────

// Helper: is the file an image?
const isImageFile = (mimeType?: string) => Boolean(mimeType?.startsWith('image/'));

function FilePreviewPanel({
  file,
  workspaceId,
  onClose,
  onAskAgent,
  onAnalyzeImage,
}: {
  file: DriveFile;
  workspaceId: string;
  onClose: () => void;
  onAskAgent: (file: DriveFile) => void;
  onAnalyzeImage: (file: DriveFile, question: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Try to load content preview for text-based files
  useEffect(() => {
    const fetchableTypes = [
      'google-apps.document',
      'google-apps.spreadsheet',
      'google-apps.presentation',
    ];
    const canFetch = fetchableTypes.some((t) => file.mimeType?.includes(t));
    if (!canFetch || !workspaceId) return;

    setLoadingContent(true);
    driveService
      .getFileContent(workspaceId, file.fileId || '')
      .then((f) => setContent(f.content?.slice(0, 500) || null))
      .catch(() => {})
      .finally(() => setLoadingContent(false));
  }, [file]);

  const copyLink = () => {
    if (file.webViewLink) {
      navigator.clipboard.writeText(file.webViewLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const typeInfo = getFileTypeInfo(file.mimeType || '');
  const Icon = typeInfo.icon;

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        width: '320px',
        minWidth: '280px',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          File Details
        </span>
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
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Icon + name */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ width: 52, height: 52, background: typeInfo.bg }}
          >
            <Icon size={26} style={{ color: typeInfo.color }} />
          </div>
          <div className="min-w-0">
            <p
              style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', wordBreak: 'break-word' }}
            >
              {file.name}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: 2 }}>
              {typeInfo.label}
            </p>
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-2">
          {file.modifiedTime && (
            <div className="flex items-center gap-2">
              <Clock size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {new Date(file.modifiedTime).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Content preview */}
        {loadingContent && (
          <div className="flex items-center gap-2">
            <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Loading preview...</span>
          </div>
        )}
        {content && (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Preview
            </p>
            <div
              className="rounded-xl p-3 text-xs"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 200,
                overflow: 'hidden',
              }}
            >
              {content}
              {content.length >= 500 && (
                <span style={{ color: 'var(--color-text-muted)' }}>...</span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {file.webViewLink && (
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 justify-center rounded-xl py-2.5 text-sm font-medium transition-all duration-150"
              style={{
                background: 'var(--color-brand)',
                color: 'white',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <ExternalLink size={14} />
              Open in Drive
            </a>
          )}
          <button
            onClick={() => onAskAgent(file)}
            className="flex items-center gap-2 justify-center w-full rounded-xl py-2.5 text-sm font-medium transition-all duration-150"
            style={{
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.4)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-brand-light)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
            }}
          >
            <MessageSquare size={14} />
            Ask Agent About This
          </button>
          {file.webViewLink && (
            <button
              onClick={copyLink}
              className="flex items-center gap-2 justify-center w-full rounded-xl py-2.5 text-sm font-medium transition-all duration-150"
              style={{
                background: 'var(--color-surface-2)',
                color: copied ? '#10B981' : 'var(--color-text-secondary)',
                border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`,
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          )}
          {/* Vision Analysis — only shown for image files */}
          {isImageFile(file.mimeType) && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Vision Analysis
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => onAnalyzeImage(file, 'Describe this image in detail — what does it show, what is the context, and what are the key visual elements?')}
                  className="flex items-center gap-2 justify-center w-full rounded-xl py-2.5 text-sm font-medium transition-all duration-150"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-brand-light)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'; }}
                >
                  <Eye size={14} />
                  Describe Image
                </button>
                <button
                  onClick={() => onAnalyzeImage(file, 'Extract all text from this image exactly as it appears. Preserve formatting, line breaks, and structure.')}
                  className="flex items-center gap-2 justify-center w-full rounded-xl py-2.5 text-sm font-medium transition-all duration-150"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-brand-light)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'; }}
                >
                  <ScanText size={14} />
                  Extract Text (OCR)
                </button>
                <button
                  onClick={() => onAnalyzeImage(file, 'Analyze this as a whiteboard image. Extract all text, list action items, note decisions made, and describe any diagrams or flowcharts.')}
                  className="flex items-center gap-2 justify-center w-full rounded-xl py-2.5 text-sm font-medium transition-all duration-150"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-brand-light)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'; }}
                >
                  <LayoutTemplate size={14} />
                  Analyze Whiteboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Document Dropdown ────────────────────────────────────────────────────────

const DOC_TYPES = [
  { type: 'blank', emoji: '📄', label: 'Blank Document' },
  { type: 'proposal', emoji: '📋', label: 'Proposal' },
  { type: 'invoice', emoji: '🧾', label: 'Invoice' },
  { type: 'meeting_notes', emoji: '📝', label: 'Meeting Notes' },
  { type: 'report', emoji: '📊', label: 'Report' },
  { type: 'sow', emoji: '📑', label: 'Statement of Work' },
] as const;

function NewDocDropdown({
  onSelect,
}: {
  onSelect: (type: 'blank' | 'proposal' | 'invoice' | 'meeting_notes' | 'report' | 'sow') => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150"
        style={{ background: 'var(--color-brand)', color: 'white' }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        <Plus size={15} />
        New Document
        <ChevronDown size={13} style={{ marginLeft: 2 }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden z-20 min-w-[200px]"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          {DOC_TYPES.map(({ type, emoji, label }) => (
            <button
              key={type}
              onClick={() => { onSelect(type as any); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors duration-100"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-2)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
              }}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Drive Page ─────────────────────────────────────────────────────────────────

export function Drive() {
  const navigate = useNavigate();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorType, setGeneratorType] = useState<any>(undefined);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);


  // Load workspaces
  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.getWorkspaces(),
  });

  const googleWorkspaces = workspaces.filter(
    (ws: any) => ws.provider?.toLowerCase() === 'google' && ws.status?.toLowerCase() !== 'revoked'
  );

  // Auto-select first workspace
  useEffect(() => {
    if (googleWorkspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(googleWorkspaces[0].id);
    }
  }, [googleWorkspaces, activeWorkspaceId]);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  // File list query
  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['drive-files', activeWorkspaceId, folderId],
    queryFn: () =>
      activeWorkspaceId
        ? driveService.getFiles(activeWorkspaceId, { folderId, maxResults: 50 })
        : Promise.resolve([]),
    enabled: !!activeWorkspaceId && !debouncedSearch,
  });

  // Search query
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['drive-search', activeWorkspaceId, debouncedSearch],
    queryFn: () =>
      activeWorkspaceId && debouncedSearch
        ? driveService.searchFiles(activeWorkspaceId, debouncedSearch)
        : Promise.resolve([]),
    enabled: !!activeWorkspaceId && !!debouncedSearch,
  });

  const displayedFiles: DriveFile[] = debouncedSearch ? searchResults : files;
  const isLoading = filesLoading || searchLoading;

  // Recent docs (top 5 non-folder files sorted by modified time)
  const recentFiles = [...files]
    .filter((f) => !f.mimeType?.includes('folder'))
    .slice(0, 5);

  const handleFolderOpen = (file: DriveFile) => {
    if (!file.mimeType?.includes('folder') || !file.fileId) return;
    setBreadcrumbs((prev) => [...prev, { id: folderId || 'root', name: file.name || 'Folder' }]);
    setFolderId(file.fileId);
    setSelectedFile(null);
  };

  const handleBreadcrumb = (index: number) => {
    const crumb = breadcrumbs[index];
    setBreadcrumbs((prev) => prev.slice(0, index));
    setFolderId(crumb.id === 'root' ? undefined : crumb.id);
  };

  const handleRootBreadcrumb = () => {
    setBreadcrumbs([]);
    setFolderId(undefined);
  };

  const handleAskAgent = (file: DriveFile) => {
    const message = `Please analyze and tell me about this file from my Google Drive:
  
File Name: ${file.name}
File Type: ${file.mimeType}
File ID: ${file.fileId}
Workspace ID: ${activeWorkspaceId}
Link: ${file.webViewLink}

Please read the content of this file and provide a summary.`;

    sessionStorage.setItem('pendingChatMessage', message);
    sessionStorage.setItem('newConversation', 'true');
    sessionStorage.setItem('pendingChatFile', JSON.stringify({ name: file.name }));
    navigate('/chat');
  };

  const handleAnalyzeImage = (file: DriveFile, question: string) => {
    const message = `${question}

File: ${file.name}
File ID: ${file.fileId}
Workspace ID: ${activeWorkspaceId}

Please use the drive_analyze_image tool (or drive_extract_text_from_image / drive_analyze_whiteboard as appropriate) to analyze this image from my Google Drive.`;

    sessionStorage.setItem('pendingChatMessage', message);
    sessionStorage.setItem('newConversation', 'true');
    navigate('/chat');
  };

  const openGenerator = (type: any) => {
    setGeneratorType(type === 'blank' ? undefined : type);
    setGeneratorOpen(true);
  };

  return (
    <div
      className="flex h-full"
      style={{ background: 'var(--color-bg)', height: 'calc(100vh - 64px)' }}
    >
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div
          className="flex-shrink-0 px-6 py-5"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="max-w-6xl mx-auto">
            {/* Header row */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h1
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Drive & Documents
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Files and documents across your workspaces
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150"
                  style={{
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.4)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
                  }}
                >
                  <Upload size={14} />
                  Upload File
                </button>
                <NewDocDropdown onSelect={openGenerator} />
              </div>
            </div>

            {/* Workspace tabs */}
            {googleWorkspaces.length > 0 && (
              <div className="flex items-center gap-1 mb-4">
                {googleWorkspaces.map((ws: any) => {
                  const isActive = ws.id === activeWorkspaceId;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspaceId(ws.id);
                        setFolderId(undefined);
                        setBreadcrumbs([]);
                        setSelectedFile(null);
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150"
                      style={{
                        background: isActive ? 'var(--color-brand-dim)' : 'transparent',
                        color: isActive ? 'var(--color-brand-light)' : 'var(--color-text-muted)',
                        border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                      }}
                    >
                      {ws.providerEmail || ws.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Search bar */}
            <div className="relative">
              <Search
                size={14}
                className="absolute"
                style={{
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Search Drive files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: 480,
                  height: 38,
                  paddingLeft: 34,
                  paddingRight: 12,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  color: 'var(--color-text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
              {debouncedSearch && (
                <p
                  className="absolute"
                  style={{
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                    paddingRight: 8,
                    maxWidth: 'calc(100% - 500px)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Search powered by Google Drive
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6">

            {/* No workspace connected */}
            {googleWorkspaces.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div
                  className="flex items-center justify-center rounded-2xl mb-5"
                  style={{ width: 72, height: 72, background: 'var(--color-surface-2)' }}
                >
                  <Cloud size={32} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  No Google Workspace Connected
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: 8, maxWidth: 360 }}>
                  Connect a Google Workspace to browse your Drive files and create documents.
                </p>
                <button
                  onClick={() => navigate('/workspaces')}
                  className="mt-5 rounded-xl px-5 py-2.5 text-sm font-medium"
                  style={{ background: 'var(--color-brand)', color: 'white' }}
                >
                  Connect Google Workspace
                </button>
              </div>
            )}

            {googleWorkspaces.length > 0 && (
              <>
                {/* Recent Documents */}
                {recentFiles.length > 0 && !debouncedSearch && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
                      <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Recent
                      </h2>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                      {recentFiles.map((file) => {
                        const info = getFileTypeInfo(file.mimeType || '');
                        const Icon = info.icon;
                        return (
                          <button
                            key={file.fileId}
                            onClick={() => setSelectedFile(file)}
                            className="flex-shrink-0 flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-150"
                            style={{
                              background: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              minWidth: 200,
                              maxWidth: 240,
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.35)';
                              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-2)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)';
                            }}
                          >
                            <div
                              className="flex items-center justify-center rounded-lg flex-shrink-0"
                              style={{ width: 32, height: 32, background: info.bg }}
                            >
                              <Icon size={16} style={{ color: info.color }} />
                            </div>
                            <p
                              className="truncate text-sm font-medium"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {file.name}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Breadcrumbs + View toggle */}
                <div className="flex items-center justify-between mb-4">
                  {/* Breadcrumbs */}
                  <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    <button
                      onClick={handleRootBreadcrumb}
                      className="flex items-center gap-1.5 transition-colors"
                      style={{ color: breadcrumbs.length === 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-brand-light)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = breadcrumbs.length === 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)')}
                    >
                      <FolderOpen size={13} />
                      My Drive
                    </button>
                    {breadcrumbs.map((crumb, idx) => (
                      <React.Fragment key={idx}>
                        <ChevronRight size={12} />
                        <button
                          onClick={() => handleBreadcrumb(idx)}
                          style={{ color: idx === breadcrumbs.length - 1 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-brand-light)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = idx === breadcrumbs.length - 1 ? 'var(--color-text-primary)' : 'var(--color-text-muted)')}
                        >
                          {crumb.name}
                        </button>
                      </React.Fragment>
                    ))}
                    {debouncedSearch && (
                      <>
                        <ChevronRight size={12} />
                        <span style={{ color: 'var(--color-text-primary)' }}>
                          Search: "{debouncedSearch}"
                        </span>
                      </>
                    )}
                  </div>

                  {/* View toggle */}
                  <div
                    className="flex items-center rounded-lg p-1"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    {(['grid', 'list'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className="flex items-center justify-center rounded-md p-1.5 transition-all duration-150"
                        style={{
                          background: viewMode === mode ? 'var(--color-surface-2)' : 'transparent',
                          color: viewMode === mode ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                        }}
                        title={`${mode} view`}
                      >
                        {mode === 'grid' ? <Grid3X3 size={14} /> : <List size={14} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loading */}
                {isLoading && (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-brand-light)' }} />
                  </div>
                )}

                {/* Empty state */}
                {!isLoading && displayedFiles.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div
                      className="flex items-center justify-center rounded-2xl mb-4"
                      style={{ width: 60, height: 60, background: 'var(--color-surface-2)' }}
                    >
                      <Cloud size={28} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      {debouncedSearch ? `No files found for "${debouncedSearch}"` : 'No files found'}
                    </p>
                  </div>
                )}

                {/* File grid */}
                {!isLoading && displayedFiles.length > 0 && (
                  <>
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {displayedFiles.map((file) => (
                          <FileCard
                            key={file.fileId}
                            file={file}
                            viewMode="grid"
                            onSelect={handleFolderOpen}
                            onPreview={setSelectedFile}
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        className="rounded-xl overflow-hidden"
                        style={{ border: '1px solid var(--color-border)' }}
                      >
                        <table className="w-full">
                          <thead>
                            <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                              <th className="px-4 py-2.5 text-left" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                              <th className="px-4 py-2.5 text-left hidden md:table-cell" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                              <th className="px-4 py-2.5 text-left hidden sm:table-cell" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modified</th>
                              <th className="px-4 py-2.5 text-left hidden lg:table-cell" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Size</th>
                              <th className="px-4 py-2.5 text-right" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedFiles.map((file) => (
                              <FileCard
                                key={file.fileId}
                                file={file}
                                viewMode="list"
                                onSelect={handleFolderOpen}
                                onPreview={setSelectedFile}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* File Preview Panel */}
      {selectedFile && activeWorkspaceId && (
        <FilePreviewPanel
          file={selectedFile}
          workspaceId={activeWorkspaceId}
          onClose={() => setSelectedFile(null)}
          onAskAgent={handleAskAgent}
          onAnalyzeImage={handleAnalyzeImage}
        />
      )}

      {/* Document Generator Modal */}
      {generatorOpen && activeWorkspaceId && (
        <DocumentGenerator
          workspaceId={activeWorkspaceId}
          defaultType={generatorType}
          onClose={() => { setGeneratorOpen(false); setGeneratorType(undefined); }}
        />
      )}
    </div>
  );
}
