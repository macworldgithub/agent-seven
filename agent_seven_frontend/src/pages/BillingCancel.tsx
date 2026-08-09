import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { XCircle, ArrowLeft } from 'lucide-react';

export function BillingCancel() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 animate-fade-in">
      <Card padding="lg" className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-[var(--color-danger-dim)] p-4">
            <XCircle size={48} className="text-[var(--color-danger)]" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Checkout Canceled</h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          No worries, your plan hasn't changed. You can upgrade anytime from your billing settings.
        </p>
        <Button variant="primary" className="w-full justify-center" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate('/billing')}>
          Return to Billing
        </Button>
      </Card>
    </div>
  );
}
