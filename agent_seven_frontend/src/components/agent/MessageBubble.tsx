import React, { useState } from 'react';
import { Message } from '../../types';
import { cn, formatRelativeTime } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { Bot, Wrench, X } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

// Emoji map for common tool names
const toolEmoji: Record<string, string> = {
  gmail: '📧',
  calendar: '📅',
  drive: '📄',
  slack: '💬',
  email: '📧',
  search: '🔍',
  memory: '🧠',
  default: '🔧',
};

function getToolEmoji(toolName: string) {
  const lower = (toolName || '').toLowerCase();
  for (const [key, emoji] of Object.entries(toolEmoji)) {
    if (lower.includes(key)) return emoji;
  }
  return toolEmoji.default;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { user } = useAuth();
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const isUser = message.role.toLowerCase() === 'user';
  
  // Cast to any to access imageUrl which might not be in types yet
  const imageUrl = (message as any).imageUrl;

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div
      className={cn(
        'flex items-end gap-3 py-1 animate-fade-in',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: '32px',
            height: '32px',
            background: 'var(--color-brand-dim)',
            border: '1px solid rgba(99,102,241,0.2)',
            marginBottom: '20px', // account for timestamp height
          }}
        >
          <Bot size={14} style={{ color: 'var(--color-brand-light)' }} />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col max-w-[70%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Bubble */}
        <div
          className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          style={
            isUser
              ? {
                  background: 'var(--color-brand)',
                  color: 'white',
                  borderRadius: '18px 18px 4px 18px',
                  fontSize: '14px',
                  lineHeight: 1.55,
                }
              : {
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: '18px 18px 18px 4px',
                  fontSize: '14px',
                  lineHeight: 1.55,
                }
          }
        >
          {imageUrl && (
            <div className="mb-3">
              <img 
                src={imageUrl} 
                alt="Attachment" 
                className="rounded-lg max-w-xs w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setIsLightboxOpen(true)}
              />
            </div>
          )}
          {message.content}

          {/* Tool use pills */}
          {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-3 pt-2.5 flex flex-wrap gap-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '4px',
                  width: '100%',
                }}
              >
                <Wrench size={10} />
                Tools used
              </span>
              {message.toolCalls.map((tool, idx) => (
                <span
                  key={idx}
                  className="font-mono"
                  style={{
                    fontSize: '11px',
                    paddingLeft: '8px',
                    paddingRight: '8px',
                    paddingTop: '2px',
                    paddingBottom: '2px',
                    borderRadius: '999px',
                    background: 'var(--color-surface-3)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getToolEmoji(tool.name || tool.type || '')} {tool.name || tool.type}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            marginTop: '4px',
            paddingLeft: '4px',
            paddingRight: '4px',
          }}
        >
          {formatRelativeTime(message.createdAt)}
        </span>
      </div>

      {/* User avatar */}
      {isUser && (
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0 text-xs font-bold"
          style={{
            width: '32px',
            height: '32px',
            background: 'var(--color-surface-3)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            marginBottom: '20px',
          }}
        >
          {initials}
        </div>
      )}

      {/* Lightbox */}
      {isLightboxOpen && imageUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors bg-black/50 rounded-full"
            onClick={() => setIsLightboxOpen(false)}
          >
            <X size={24} />
          </button>
          <img 
            src={imageUrl} 
            alt="Attachment fullscreen" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
