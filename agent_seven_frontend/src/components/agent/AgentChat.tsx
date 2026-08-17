import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Search, Bot, Mail, Calendar, FileText, MessageSquare, Pencil, Mic, Camera, FolderOpen, ExternalLink, X, Image as ImageIcon } from 'lucide-react';
import { useMessages, useConversations, useSendMessage, useSendMessageWithImage } from '../../hooks/useAgent';
import { useAgentStore } from '../../store/agentStore';
import { MessageBubble } from './MessageBubble';
import { VoiceRecorder } from './VoiceRecorder';
import { CameraCapture } from '../pwa/CameraCapture';
import { Spinner } from '../ui/Spinner';
import { cn } from '../../lib/utils';
import { Conversation } from '../../types';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeTime } from '../../lib/utils';

const suggestions = [
  { icon: Mail, label: 'Summarise my emails', prompt: 'Please summarise my unread emails from today.' },
  { icon: Calendar, label: 'Check my calendar', prompt: 'What does my schedule look like for today and tomorrow?' },
  { icon: FolderOpen, label: 'Search my Drive', prompt: 'Search my Drive for recent documents.' },
  { icon: FileText, label: 'Create a proposal', prompt: 'Help me create a client proposal.' },
  { icon: MessageSquare, label: 'Generate an invoice', prompt: 'Generate an invoice for a client.' },
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
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isNewChat, setIsNewChat] = useState(false);
  const [search, setSearch] = useState('');
  const [attachedFile, setAttachedFile] = useState<{name: string} | null>(null);
  const [pendingImage, setPendingImage] = useState<{ blob: Blob; mimeType: string; preview: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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
  const sendMessageWithImageMutation = useSendMessageWithImage();

  const firstName = user?.name?.split(' ')[0] || 'Founder';

  useEffect(() => {
    const pendingMessage = sessionStorage.getItem('pendingChatMessage');
    const isNew = sessionStorage.getItem('newConversation');
    const pendingFileStr = sessionStorage.getItem('pendingChatFile');
    
    if (pendingMessage && isNew === 'true') {
      sessionStorage.removeItem('pendingChatMessage');
      sessionStorage.removeItem('newConversation');
      sessionStorage.removeItem('pendingChatFile');
      
      setCurrentConversation(null);
      useAgentStore.getState().setMessages([]);
      
      setInput(pendingMessage);
      if (pendingFileStr) {
        try {
          setAttachedFile(JSON.parse(pendingFileStr));
        } catch(e) {}
      }
      
      setTimeout(() => {
        sendMessageMutation.mutate({
          content: pendingMessage,
          conversationId: undefined,
        });
        setInput('');
        setAttachedFile(null);
      }, 500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Handle mobile keyboard scrolling
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    
    const handler = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    viewport.addEventListener('resize', handler);
    return () => viewport.removeEventListener('resize', handler);
  }, []);

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
    if ((!input.trim() && !pendingImage) || isThinking) return;

    const messageText = input.trim() || 'Please analyze this image.';

    if (pendingImage) {
      // Send with image via vision endpoint
      sendMessageWithImageMutation.mutate({
        content: messageText,
        conversationId: currentConversation?.id,
        imageBlob: pendingImage.blob,
        mimeType: pendingImage.mimeType,
        imagePreviewUrl: pendingImage.preview,
      });
      setPendingImage(null);
    } else {
      sendMessageMutation.mutate({
        content: messageText,
        conversationId: currentConversation?.id,
      });
    }
    setInput('');
    setAttachedFile(null);
  };

  const handleSuggestion = (prompt: string) => {
    sendMessageMutation.mutate({
      content: prompt,
      conversationId: undefined,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const preview = reader.result as string;
      setPendingImage({
        blob: file,
        mimeType: file.type,
        preview,
      });
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const createNewChat = () => {
    setIsNewChat(true);
    setCurrentConversation(null);
    useAgentStore.getState().setMessages([]);
  };

  const filteredConversations = (conversations || []).filter((c: Conversation) =>
    (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleImageCapture = (imageBase64: string, question?: string) => {
    setIsCameraOpen(false);
    const content = question || "Please analyze this image and tell me what you see.";
    
    sendMessageMutation.mutate({
      content,
      conversationId: currentConversation?.id,
    });
    // In a full implementation, you'd attach the base64 image here.
    // For now, we simulate sending the message as text.
  };

  const hasMessages = messages.length > 0 || isThinking;

  return (
    <div
      className="flex"
      style={{ height: 'calc(100vh - 64px - env(safe-area-inset-bottom))', background: 'var(--color-bg)' }}
    >
      {isCameraOpen && (
        <CameraCapture 
          onCapture={handleImageCapture} 
          onClose={() => setIsCameraOpen(false)} 
        />
      )}
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
                <React.Fragment key={message.id}>
                  <MessageBubble message={message} />
                  {/* Document Created card — detect docs.google.com link in assistant messages */}
                  {message.role === 'assistant' && (() => {
                    const docMatch = message.content?.match(/https:\/\/docs\.google\.com\/document\/d\/([\w-]+)\/[\w?=&%]+/i);
                    const titleMatch = message.content?.match(/(?:titled?|called?|named?)[:\s]+["']?([^"'\n]+?)["']?(?:\s+has been|\s+was|\s+is|[\.,]|$)/i);
                    if (!docMatch) return null;
                    return (
                      <div
                        className="ml-11 rounded-xl p-4 mt-1 mb-2 animate-fade-in"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid rgba(99,102,241,0.25)',
                          maxWidth: '480px',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="flex items-center justify-center rounded-lg"
                            style={{ width: 28, height: 28, background: 'rgba(99,102,241,0.12)' }}
                          >
                            <FileText size={14} style={{ color: 'var(--color-brand-light)' }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-brand-light)' }}>
                            Document Created
                          </span>
                        </div>
                        {titleMatch?.[1] && (
                          <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginBottom: 8, fontWeight: 500 }}>
                            {titleMatch[1].trim()}
                          </p>
                        )}
                        <a
                          href={docMatch[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                          style={{ color: 'var(--color-brand-light)', textDecoration: 'none' }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                        >
                          Open in Google Drive <ExternalLink size={11} />
                        </a>
                      </div>
                    );
                  })()}
                </React.Fragment>
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
                {attachedFile && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2 text-xs" style={{ background: 'var(--color-surface-3)' }}>
                    <FileText size={12} style={{ color: 'var(--color-brand)' }} />
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{attachedFile.name}</span>
                    <button type="button" onClick={() => setAttachedFile(null)} className="ml-auto transition-colors" style={{ color: 'var(--color-text-muted)' }} onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                      <X size={12} />
                    </button>
                  </div>
                )}
                {/* Pending image preview */}
                {pendingImage && (
                  <div style={{ display: 'inline-block', position: 'relative', marginBottom: 8, marginLeft: 4 }}>
                    <img
                      src={pendingImage.preview}
                      alt="Pending upload"
                      style={{
                        height: 72,
                        width: 72,
                        borderRadius: 8,
                        objectFit: 'cover',
                        border: '2px solid var(--color-brand)',
                        display: 'block',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setPendingImage(null)}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: '#EF4444',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
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
                    {/* Image upload button */}
                    <label
                      className="flex items-center justify-center rounded-lg p-1.5 transition-all duration-150 cursor-pointer"
                      style={{ color: pendingImage ? 'var(--color-brand-light)' : 'var(--color-text-muted)' }}
                      title="Upload image for analysis"
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLLabelElement).style.color = 'var(--color-text-secondary)';
                        (e.currentTarget as HTMLLabelElement).style.background = 'var(--color-surface-3)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLLabelElement).style.color = pendingImage ? 'var(--color-brand-light)' : 'var(--color-text-muted)';
                        (e.currentTarget as HTMLLabelElement).style.background = 'transparent';
                      }}
                    >
                      <ImageIcon size={15} />
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCameraOpen(true)}
                      title="Camera"
                      className="flex items-center justify-center rounded-lg p-1.5 transition-all duration-150"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-3)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                    >
                      <Camera size={15} />
                    </button>
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
                      disabled={(!input.trim() && !pendingImage) || isThinking}
                      className="flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95"
                      style={{
                        width: '34px',
                        height: '34px',
                        background:
                          (input.trim() || pendingImage) && !isThinking
                            ? 'var(--color-brand)'
                            : 'var(--color-surface-3)',
                        color:
                          (input.trim() || pendingImage) && !isThinking
                            ? 'white'
                            : 'var(--color-text-muted)',
                        cursor:
                          (!input.trim() && !pendingImage) || isThinking ? 'not-allowed' : 'pointer',
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
