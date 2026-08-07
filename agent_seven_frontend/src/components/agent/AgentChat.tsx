import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Search, Bot, Mail, Calendar, FileText, MessageSquare, Pencil, Mic } from 'lucide-react';
import { useMessages, useConversations, useSendMessage } from '../../hooks/useAgent';
import { useAgentStore } from '../../store/agentStore';
import { MessageBubble } from './MessageBubble';
import { VoiceRecorder } from './VoiceRecorder';
import { Spinner } from '../ui/Spinner';
import { cn } from '../../lib/utils';
import { Conversation } from '../../types';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeTime } from '../../lib/utils';

const suggestions = [
  { icon: Mail, label: 'Summarise my emails', prompt: 'Please summarise my unread emails from today.' },
  { icon: Calendar, label: 'Check my calendar', prompt: 'What does my schedule look like for today and tomorrow?' },
  { icon: MessageSquare, label: 'Create a meeting', prompt: 'Help me schedule a meeting for this week.' },
  { icon: FileText, label: 'List action items', prompt: 'What are my current open action items?' },
];

function GradientOrb({ size = 80 }: { size?: number }) {
  return (
    <div
      className="animate-pulse-glow pointer-events-none"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background:
          'radial-gradient(circle at 40% 40%, #818CF8 0%, #6366F1 40%, #10B981 80%, transparent 100%)',
        opacity: 0.5,
        filter: `blur(${size / 5}px)`,
      }}
    />
  );
}

export function AgentChat() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isNewChat, setIsNewChat] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  const currentConversation = useAgentStore((s) => s.currentConversation);
  const setCurrentConversation = useAgentStore((s) => s.setCurrentConversation);
  const messages = useAgentStore((s) => s.messages);
  const isThinking = useAgentStore((s) => s.isThinking);

  const { data: conversations } = useConversations();
  useMessages(currentConversation?.id || null);

  const sendMessageMutation = useSendMessage();

  const firstName = user?.name?.split(' ')[0] || 'there';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  useEffect(() => {
    if (!currentConversation && conversations && conversations.length > 0 && !isNewChat) {
      setCurrentConversation(conversations[0]);
    }
  }, [conversations, currentConversation, setCurrentConversation, isNewChat]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isThinking) return;
    sendMessageMutation.mutate({
      content: input,
      conversationId: currentConversation?.id,
    });
    setInput('');
  };

  const handleSuggestion = (prompt: string) => {
    sendMessageMutation.mutate({
      content: prompt,
      conversationId: undefined,
    });
  };

  const createNewChat = () => {
    setIsNewChat(true);
    setCurrentConversation(null);
    useAgentStore.getState().setMessages([]);
  };

  const filteredConversations = (conversations || []).filter((c: Conversation) =>
    (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const hasMessages = messages.length > 0 || isThinking;

  return (
    <div
      className="flex"
      style={{ height: 'calc(100vh - 64px)', background: 'var(--color-bg)' }}
    >
      {/* Conversation List — hidden on mobile */}
      <div
        className="hidden lg:flex flex-col flex-shrink-0"
        style={{
          width: '288px',
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Conversations
          </span>
          <button
            onClick={createNewChat}
            title="New chat"
            className="flex items-center justify-center rounded-lg p-1.5 transition-all duration-150"
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
            <Pencil size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-3 flex-shrink-0">
          <div className="relative">
            <Search
              size={13}
              className="absolute"
              style={{
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: '34px',
                paddingLeft: '30px',
                paddingRight: '10px',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
          {filteredConversations.map((conv: Conversation) => {
            const isActive = currentConversation?.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => {
                  setCurrentConversation(conv);
                  setIsNewChat(false);
                }}
                className="w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all duration-150"
                style={{
                  background: isActive ? 'var(--color-brand-dim)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--color-brand)' : '2px solid transparent',
                  paddingLeft: isActive ? '10px' : '12px',
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'var(--color-surface-2)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                  style={{
                    width: '28px',
                    height: '28px',
                    background: isActive ? 'rgba(99,102,241,0.2)' : 'var(--color-surface-3)',
                    color: isActive ? 'var(--color-brand-light)' : 'var(--color-text-muted)',
                  }}
                >
                  A7
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate"
                    style={{
                      fontSize: '13px',
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {conv.title || 'New Conversation'}
                  </p>
                  <p
                    style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}
                  >
                    {formatRelativeTime(conv.createdAt || new Date().toISOString())}
                  </p>
                </div>
              </button>
            );
          })}

          {filteredConversations.length === 0 && (
            <div className="py-8 text-center">
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                No conversations yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: hasMessages ? '24px' : undefined }}
        >
          {!hasMessages ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="mb-6 relative">
                <GradientOrb size={80} />
              </div>

              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.02em',
                  marginBottom: '8px',
                }}
              >
                Good morning, {firstName}. What can I help with?
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '32px' }}>
                I can read emails, manage your calendar, search documents, and send messages.
              </p>

              {/* Suggestion cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSuggestion(s.prompt)}
                    className="flex items-start gap-3 rounded-xl p-4 text-left transition-all duration-150"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        'rgba(99,102,241,0.4)';
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'var(--color-surface-2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        'var(--color-border)';
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'var(--color-surface)';
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{
                        width: '32px',
                        height: '32px',
                        background: 'var(--color-brand-dim)',
                      }}
                    >
                      <s.icon size={15} style={{ color: 'var(--color-brand-light)' }} />
                    </div>
                    <span
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        fontWeight: 500,
                        lineHeight: 1.4,
                      }}
                    >
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-3xl mx-auto space-y-1">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {/* Thinking indicator */}
              {isThinking && (
                <div className="flex items-end gap-3 animate-fade-in">
                  <div
                    className="flex items-center justify-center rounded-full flex-shrink-0"
                    style={{
                      width: '32px',
                      height: '32px',
                      background: 'var(--color-brand-dim)',
                      border: '1px solid rgba(99,102,241,0.2)',
                    }}
                  >
                    <Bot size={14} style={{ color: 'var(--color-brand-light)' }} />
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm"
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <span
                        key={i}
                        className="animate-bounce-dot"
                        style={{
                          display: 'block',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--color-text-muted)',
                          animationDelay: `${delay}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div
          className="flex-shrink-0 p-4"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <div className="max-w-3xl mx-auto">
            {isVoiceMode ? (
              <div className="flex justify-center py-4">
                <VoiceRecorder
                  conversationId={currentConversation?.id}
                  onResponse={() => {
                    queryClient.invalidateQueries({ queryKey: ['messages'] });
                    queryClient.invalidateQueries({ queryKey: ['conversations'] });
                  }}
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div
                  className="flex items-end gap-3 rounded-2xl p-3 transition-all duration-150"
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                  }}
                  onFocus={() => {}}
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Agent Seven..."
                    rows={1}
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                    style={{
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      maxHeight: '128px',
                      resize: 'none',
                      border: 'none',
                      outline: 'none',
                      paddingTop: '4px',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsVoiceMode(!isVoiceMode)}
                      title="Voice input"
                      className="flex items-center justify-center rounded-lg p-1.5 transition-all duration-150"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          'var(--color-text-secondary)';
                        (e.currentTarget as HTMLButtonElement).style.background =
                          'var(--color-surface-3)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          'var(--color-text-muted)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                    >
                      <Mic size={15} />
                    </button>
                    <button
                      type="submit"
                      disabled={!input.trim() || isThinking}
                      className="flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95"
                      style={{
                        width: '34px',
                        height: '34px',
                        background:
                          input.trim() && !isThinking
                            ? 'var(--color-brand)'
                            : 'var(--color-surface-3)',
                        color:
                          input.trim() && !isThinking
                            ? 'white'
                            : 'var(--color-text-muted)',
                        cursor:
                          !input.trim() || isThinking ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isThinking ? (
                        <Spinner size="sm" />
                      ) : (
                        <Send size={14} />
                      )}
                    </button>
                  </div>
                </div>
                <p
                  className="text-center mt-2"
                  style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
                >
                  Enter to send · Shift+Enter for new line
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
