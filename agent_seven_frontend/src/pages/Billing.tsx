import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Check, CreditCard, Zap } from 'lucide-react';
import { agentService } from '../services/agent.service';
import { Plan, Subscription, Usage } from '../types';
import { cn } from '../lib/utils';
import { useWorkspaces } from '../hooks/useWorkspace';

export function Billing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const { data: workspaces } = useWorkspaces();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      agentService.getPlans(),
      agentService.getSubscription(),
      agentService.getUsage()
    ]).then(([plansData, subData, usageData]) => {
      setPlans(plansData);
      setSubscription(subData);
      setUsage(usageData);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load billing data', err);
      setLoading(false);
    });
  }, []);

  const handleCheckout = async (planId: string) => {
    try {
      const { url } = await agentService.createCheckout(planId);
      window.location.href = url;
    } catch (err) {
      console.error('Failed to create checkout session', err);
    }
  };

  const handlePortal = async () => {
    try {
      const { url } = await agentService.createPortal();
      window.location.href = url;
    } catch (err) {
      console.error('Failed to open billing portal', err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[var(--color-text-muted)]">Loading billing info...</div>;
  }

  const currentPlanId = subscription?.plan || 'FREE';
  const currentPlan = plans.find(p => p.id === currentPlanId) || { name: 'Free', limits: { toolCallsPerDay: 20, workspaces: 1 } } as Plan;
  
  const workspacesCount = workspaces?.length || 0;
  const toolCallsCount = usage?.toolCallCount || 0;
  const toolCallsLimit = currentPlan.limits?.toolCallsPerDay || 20;
  const workspacesLimit = currentPlan.limits?.workspaces || 1;

  const toolCallsPercent = Math.min(100, Math.round((toolCallsCount / toolCallsLimit) * 100));
  const workspacesPercent = Math.min(100, Math.round((workspacesCount / workspacesLimit) * 100));

  const planOrder = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];
  const currentPlanIndex = planOrder.indexOf(currentPlanId);

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Billing & Plans</h1>
        <p className="text-[var(--color-text-muted)]">Manage your subscription, usage limits, and billing history.</p>
      </div>

      {/* Current Plan Card */}
      <Card padding="lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex-1 w-full">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{currentPlan.name} Plan</h2>
              <Badge variant={subscription?.status === 'ACTIVE' ? 'success' : 'default'}>
                {subscription?.status || 'ACTIVE'}
              </Badge>
            </div>
            {currentPlanId === 'FREE' ? (
              <p className="text-[var(--color-text-muted)] text-sm mb-6">
                You are on the free plan. Upgrade to unlock more AI actions and workspaces.
              </p>
            ) : (
              <p className="text-[var(--color-text-muted)] text-sm mb-6">
                Current period: {usage?.periodStart ? new Date(usage.periodStart).toLocaleDateString() : 'N/A'} - {usage?.periodEnd ? new Date(usage.periodEnd).toLocaleDateString() : 'N/A'}
              </p>
            )}

            <div className="space-y-4 max-w-md">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--color-text-secondary)]">AI Actions (Monthly)</span>
                  <span className="text-[var(--color-text-primary)] font-medium">{toolCallsCount} / {toolCallsLimit === 999999 ? 'Unlimited' : toolCallsLimit}</span>
                </div>
                <div className="w-full bg-[var(--color-surface-2)] rounded-full h-2">
                  <div className="bg-[var(--color-brand-light)] h-2 rounded-full" style={{ width: `${toolCallsPercent}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--color-text-secondary)]">Workspaces</span>
                  <span className="text-[var(--color-text-primary)] font-medium">{workspacesCount} / {workspacesLimit === 999 ? 'Unlimited' : workspacesLimit}</span>
                </div>
                <div className="w-full bg-[var(--color-surface-2)] rounded-full h-2">
                  <div className="bg-[var(--color-accent)] h-2 rounded-full" style={{ width: `${workspacesPercent}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0">
            <Button variant="secondary" leftIcon={<CreditCard size={16} />} onClick={handlePortal}>
              Manage Billing
            </Button>
          </div>
        </div>
      </Card>

      {/* Pricing Plans */}
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const planIndex = planOrder.indexOf(plan.id);
            const isUpgrade = planIndex > currentPlanIndex;
            const isPro = plan.id === 'PRO';

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-xl border p-6 flex flex-col bg-[var(--color-surface)]",
                  isPro ? "border-[var(--color-brand-light)] shadow-lg scale-[1.02]" : "border-[var(--color-border)]"
                )}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-[var(--color-brand-light)] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Zap size={12} /> Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[var(--color-text-primary)]">${plan.price}</span>
                    <span className="text-[var(--color-text-muted)]">/{plan.interval}</span>
                  </div>
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[var(--color-text-secondary)]">
                      <Check size={16} className="text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isCurrent ? 'outline' : isUpgrade ? 'primary' : 'ghost'}
                  disabled={isCurrent}
                  className="w-full justify-center"
                  onClick={() => !isCurrent && handleCheckout(plan.id)}
                >
                  {isCurrent ? 'Current Plan' : isUpgrade ? `Upgrade to ${plan.name}` : 'Downgrade'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage History */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Usage History</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Usage resets monthly based on your billing cycle.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--color-surface-2)]">
                <th className="px-6 py-3 font-medium text-[var(--color-text-secondary)]">Period</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-secondary)]">AI Actions</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-secondary)]">Tokens Used</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-secondary)]">Voice Minutes</th>
              </tr>
            </thead>
            <tbody>
              {usage ? (
                <tr className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors">
                  <td className="px-6 py-4 text-[var(--color-text-primary)]">
                    {new Date(usage.periodStart).toLocaleDateString()} - {new Date(usage.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">{usage.toolCallCount}</td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">{usage.llmTokensUsed.toLocaleString()}</td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">{usage.voiceMinutesUsed.toFixed(1)}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[var(--color-text-muted)]">
                    No usage history available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
