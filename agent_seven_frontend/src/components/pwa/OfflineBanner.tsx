import React, { useState, useEffect } from 'react';
import { WifiOff, X } from 'lucide-react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false); // Reset dismissal so it shows again if they go offline
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline || dismissed) return null;

  return (
    <div className="w-full bg-warning/10 border-b border-warning/20 px-4 py-2 flex items-center justify-center gap-3 z-50">
      <WifiOff size={16} className="text-warning" />
      <span className="text-sm text-warning font-medium">
        You're offline. Some features may not work.
      </span>
      <button 
        onClick={() => setDismissed(true)}
        className="text-warning/80 hover:text-warning ml-4 p-1 rounded-full transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
