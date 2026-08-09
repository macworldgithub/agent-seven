import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { CheckCircle } from 'lucide-react';

export function BillingSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/billing');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 animate-fade-in">
      <Card padding="lg" className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-[var(--color-success-dim)] p-4">
            <CheckCircle size={48} className="text-[var(--color-success)] animate-pulse" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Payment successful!</h1>
        <p className="text-[var(--color-text-muted)] mb-6">
          Your plan has been upgraded. You will be redirected shortly...
        </p>
        <div className="w-full bg-[var(--color-surface-2)] h-1 rounded-full overflow-hidden">
          <div className="bg-[var(--color-success)] h-full animate-[progress_3s_ease-in-out]" style={{ width: '100%' }}></div>
        </div>
      </Card>
    </div>
  );
}
