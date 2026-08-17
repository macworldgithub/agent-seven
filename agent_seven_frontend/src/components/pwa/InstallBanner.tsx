import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { X, Zap, Share } from 'lucide-react';

export function InstallBanner() {
  const { install, canInstall, isInstalled, isIOS } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
    if (isDismissed || isInstalled || !canInstall) {
      setDismissed(true);
      return;
    }

    // Auto-show after 15 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, [isInstalled, canInstall]);

  if (dismissed || !isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleInstall = async () => {
    if (isIOS) {
      // For iOS, just show instructions inline
      alert('To install: tap the Share button (square with arrow up) at the bottom of Safari, then tap "Add to Home Screen".');
    } else {
      const success = await install();
      if (success) {
        setIsVisible(false);
      }
    }
  };

  return (
    <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-50 animate-slide-up bg-surface border-t border-border shadow-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
          <Zap size={20} className="text-brand" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">Install Agent Seven</p>
          <p className="text-xs text-muted">Get the full experience on your device</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleInstall}
          className="bg-brand text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-brand-hover transition-colors"
        >
          {isIOS ? 'Instructions' : 'Install'}
        </button>
        <button
          onClick={handleDismiss}
          className="text-muted hover:text-primary p-1 rounded-full transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
