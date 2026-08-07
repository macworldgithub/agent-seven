import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { useSendMessage, useMessages, useConversations } from '../../hooks/useAgent';
import { useAgentStore } from '../../store/agentStore';
import { ChevronRight, Sparkles } from 'lucide-react';
import { MessageBubble } from '../agent/MessageBubble';
import { Bot } from 'lucide-react';

export function Step7FirstSuccess({ onNext }: { onNext: () => void }) {
  const sendMessageMutation = useSendMessage();
  const [hasStarted, setHasStarted] = useState(false);
  const isThinking = useAgentStore((s) => s.isThinking);
  const messages = useAgentStore((s) => s.messages);
  const currentConversation = useAgentStore((s) => s.currentConversation);

  useMessages(currentConversation?.id || 'temp');
  useConversations();

  useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true);
      setTimeout(() => {
        sendMessageMutation.mutate({ content: 'Summarise my last 5 emails across all my workspaces' });
      }, 1000);
    }
  }, [hasStarted, sendMessageMutation]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-8 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} style={{ color: 'var(--color-brand-light)' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Let's try it out!
          </h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Agent Seven is analyzing your connected workspaces…
        </p>
      </div>

      <div
        className="flex-1 px-8 pb-4 overflow-y-auto"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="max-w-xl mx-auto space-y-2 py-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isThinking && (
            <div className="flex items-end gap-3 animate-fade-in">
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: '32px', height: '32px', background: 'var(--color-brand-dim)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <Bot size={14} style={{ color: 'var(--color-brand-light)' }} />
              </div>
              <div
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
              >
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span
                    key={i}
                    className="animate-bounce-dot"
                    style={{ display: 'block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-text-muted)', animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex justify-end" style={{ borderTop: '1px solid var(--color-border)' }}>
        <Button
          variant="primary"
          size="md"
          leftIcon={<ChevronRight size={14} />}
          onClick={onNext}
          disabled={isThinking && messages.length < 2}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
