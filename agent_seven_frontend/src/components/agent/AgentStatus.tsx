import React from 'react';
import { useAgentStore } from '../../store/agentStore';
import { cn } from '../../lib/utils';

export function AgentStatus() {
  const isThinking = useAgentStore((state) => state.isThinking);

  // In a full implementation, we might have more complex state coming from a websocket
  // For now, we derive IDLE/THINKING from the store
  
  return (
    <div className="flex items-center space-x-2">
      <div className="relative flex h-3 w-3">
        {isThinking ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        )}
      </div>
      <span className={cn(
        "text-sm font-medium",
        isThinking ? "text-yellow-700" : "text-green-700"
      )}>
        {isThinking ? 'Thinking...' : 'Ready'}
      </span>
    </div>
  );
}
