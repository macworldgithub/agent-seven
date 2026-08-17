import React from 'react';
import {
  FileText,
  Sheet,
  Presentation,
  FileArchive,
  Folder,
  File,
  ExternalLink,
  Eye,
  MoreHorizontal,
} from 'lucide-react';
import { DriveFile } from '../../services/drive.service';
import { formatRelativeTime } from '../../lib/utils';

// ─── File type helpers ─────────────────────────────────────────────────────────

type FileTypeInfo = {
  icon: React.FC<any>;
  color: string;
  bg: string;
  label: string;
};

function getFileTypeInfo(mimeType: string): FileTypeInfo {
  if (mimeType?.includes('google-apps.document')) {
    return { icon: FileText, color: '#4285F4', bg: 'rgba(66,133,244,0.12)', label: 'Google Doc' };
  }
  if (mimeType?.includes('google-apps.spreadsheet')) {
    return { icon: Sheet, color: '#34A853', bg: 'rgba(52,168,83,0.12)', label: 'Google Sheet' };
  }
  if (mimeType?.includes('google-apps.presentation')) {
    return { icon: Presentation, color: '#FBBC04', bg: 'rgba(251,188,4,0.12)', label: 'Google Slides' };
  }
  if (mimeType?.includes('google-apps.folder')) {
    return { icon: Folder, color: '#FBBC04', bg: 'rgba(251,188,4,0.12)', label: 'Folder' };
  }
  if (mimeType === 'application/pdf') {
    return { icon: FileArchive, color: '#EA4335', bg: 'rgba(234,67,53,0.12)', label: 'PDF' };
  }
  return { icon: File, color: 'var(--color-text-muted)', bg: 'var(--color-surface-3)', label: 'File' };
}

function formatSize(size?: string): string {
  if (!size) return '';
  const bytes = parseInt(size, 10);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Grid Card ─────────────────────────────────────────────────────────────────

interface FileCardProps {
  file: DriveFile;
  viewMode?: 'grid' | 'list';
  onSelect?: (file: DriveFile) => void;
  onPreview?: (file: DriveFile) => void;
}

function GridCard({ file, onSelect, onPreview }: Omit<FileCardProps, 'viewMode'>) {
  const [hovered, setHovered] = React.useState(false);
  const typeInfo = getFileTypeInfo(file.mimeType || '');
  const Icon = typeInfo.icon;
  const isFolder = file.mimeType?.includes('google-apps.folder');

  return (
    <div
      className="relative rounded-xl p-4 cursor-pointer transition-all duration-150 group"
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${hovered ? 'rgba(99,102,241,0.35)' : 'var(--color-border)'}`,
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.12)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => (isFolder ? onSelect?.(file) : onPreview?.(file))}
    >
      {/* File type icon */}
      <div
        className="flex items-center justify-center rounded-xl mb-3"
        style={{ width: 48, height: 48, background: typeInfo.bg }}
      >
        <Icon size={24} style={{ color: typeInfo.color }} />
      </div>

      {/* Name */}
      <p
        className="font-medium text-sm leading-snug"
        style={{
          color: 'var(--color-text-primary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
        title={file.name || ''}
      >
        {file.name}
      </p>

      {/* Meta */}
      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
        {file.modifiedTime
          ? formatRelativeTime(file.modifiedTime)
          : typeInfo.label}
      </p>

      {/* Hover actions */}
      {hovered && !isFolder && (
        <div
          className="absolute bottom-3 right-3 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {file.webViewLink && (
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-lg p-1.5 transition-colors"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
              title="Open in Drive"
            >
              <ExternalLink size={13} />
            </a>
          )}
          <button
            className="flex items-center justify-center rounded-lg p-1.5 transition-colors"
            style={{
              background: 'var(--color-brand-dim)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: 'var(--color-brand-light)',
            }}
            title="Preview"
            onClick={() => onPreview?.(file)}
          >
            <Eye size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function ListRow({ file, onSelect, onPreview }: Omit<FileCardProps, 'viewMode'>) {
  const [hovered, setHovered] = React.useState(false);
  const typeInfo = getFileTypeInfo(file.mimeType || '');
  const Icon = typeInfo.icon;
  const isFolder = file.mimeType?.includes('google-apps.folder');

  return (
    <tr
      className="transition-colors duration-100 cursor-pointer"
      style={{
        background: hovered ? 'var(--color-surface-2)' : 'transparent',
        borderBottom: '1px solid var(--color-border)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => (isFolder ? onSelect?.(file) : onPreview?.(file))}
    >
      {/* Icon + Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ width: 32, height: 32, background: typeInfo.bg }}
          >
            <Icon size={16} style={{ color: typeInfo.color }} />
          </div>
          <span
            className="text-sm font-medium truncate max-w-xs"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {file.name}
          </span>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {typeInfo.label}
        </span>
      </td>

      {/* Modified */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {file.modifiedTime ? formatRelativeTime(file.modifiedTime) : '—'}
        </span>
      </td>

      {/* Size */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {formatSize(file.size) || '—'}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 justify-end">
          {file.webViewLink && (
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-lg p-1.5 transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              title="Open in Drive"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-brand-light)';
                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-brand-dim)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-muted)';
                (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
              }}
            >
              <ExternalLink size={13} />
            </a>
          )}
          <button
            className="flex items-center justify-center rounded-lg p-1.5 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            title="Preview"
            onClick={() => onPreview?.(file)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-brand-light)';
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-brand-dim)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <MoreHorizontal size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Export ────────────────────────────────────────────────────────────────────

export function FileCard({ file, viewMode = 'grid', onSelect, onPreview }: FileCardProps) {
  if (viewMode === 'list') {
    return <ListRow file={file} onSelect={onSelect} onPreview={onPreview} />;
  }
  return <GridCard file={file} onSelect={onSelect} onPreview={onPreview} />;
}

export { getFileTypeInfo };
