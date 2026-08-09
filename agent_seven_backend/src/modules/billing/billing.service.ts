import Stripe from 'stripe';
import { prisma } from '../../config/db';
import { env } from '../../config/env';

const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-06-30.basil' as any,
});

export const billingService = {
  async getOrCreateStripeCustomer(tenantId: string): Promise<string> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { isOrgAdmin: true }, take: 1 } }
    });

    if (!tenant) throw new Error('Tenant not found');
    if (tenant.stripeCustomerId) return tenant.stripeCustomerId;

    const admin = tenant.users[0];
    const customer = await stripe.customers.create({
      email: admin?.email || `admin@${tenant.slug}.com`,
      name: tenant.name,
      metadata: { tenantId }
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customer.id }
    });

    return customer.id;
  },

  async createCheckoutSession(tenantId: string, plan: 'STARTER' | 'PRO' | 'ENTERPRISE'): Promise<{ url: string }> {
    const customerId = await this.getOrCreateStripeCustomer(tenantId);
    
    const PRICE_IDS = {
      STARTER: env.STRIPE_PRICE_STARTER,
      PRO: env.STRIPE_PRICE_PRO,
      ENTERPRISE: env.STRIPE_PRICE_ENTERPRISE
    };

    const priceId = PRICE_IDS[plan];

    if (!priceId) throw new Error('Price ID not configured for plan');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/billing`,
      metadata: { tenantId }
    });

    if (!session.url) throw new Error('Failed to create checkout session url');
    return { url: session.url };
  },

  getPlanLimits(plan: string) {
    const PLAN_LIMITS: Record<string, { toolCallsPerDay: number, workspaces: number }> = {
      FREE: { toolCallsPerDay: 20, workspaces: 1 },
      STARTER: { toolCallsPerDay: 200, workspaces: 3 },
      PRO: { toolCallsPerDay: 1000, workspaces: 10 },
      ENTERPRISE: { toolCallsPerDay: 999999, workspaces: 999 }
    };
    return PLAN_LIMITS[plan] || PLAN_LIMITS['FREE'];
  },

  async checkUsageLimits(tenantId: string): Promise<{ allowed: boolean, reason?: string }> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return { allowed: false, reason: 'Tenant not found' };

    const limits = this.getPlanLimits(tenant.plan);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const toolCallsToday = await prisma.toolCall.count({
      where: {
        tenantId,
        createdAt: { gte: startOfDay }
      }
    });

    if (toolCallsToday >= limits.toolCallsPerDay) {
      return { allowed: false, reason: 'Daily tool call limit reached. Upgrade your plan.' };
    }

    return { allowed: true };
  },

  async createBillingPortalSession(tenantId: string): Promise<{ url: string }> {
    const customerId = await this.getOrCreateStripeCustomer(tenantId);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.FRONTEND_URL}/billing`
    });

    return { url: session.url };
  },

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET || '';
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              subscriptionStatus: 'ACTIVE',
              stripeSubscriptionId: session.subscription as string,
              // We could derive the plan from the line items, but for now we'll just set it to PRO or whatever was passed
              plan: 'PRO' // Default assumption if not passed in metadata
            }
          });
          await prisma.auditLog.create({
            data: { tenantId, action: 'billing.subscription.created', metaJson: JSON.stringify({ eventType: event.type }) }
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const tenant = await prisma.tenant.findFirst({ where: { stripeCustomerId: customerId } });
        if (tenant) {
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { subscriptionStatus: isActive ? 'ACTIVE' : 'PAST_DUE' }
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const tenant = await prisma.tenant.findFirst({ where: { stripeCustomerId: customerId } });
        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { plan: 'FREE', subscriptionStatus: 'CANCELLED' }
          });
          await prisma.auditLog.create({
            data: { tenantId: tenant.id, action: 'billing.subscription.cancelled' }
          });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const tenant = await prisma.tenant.findFirst({ where: { stripeCustomerId: customerId } });
        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { subscriptionStatus: 'PAST_DUE' }
          });
          await prisma.auditLog.create({
            data: { tenantId: tenant.id, action: 'billing.payment.failed' }
          });
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  },

  async getSubscription(tenantId: string): Promise<any> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant not found');

    let currentPeriodEnd = null;
    let cancelAtPeriodEnd = false;

    if (tenant.stripeSubscriptionId) {
      try {
        const sub: any = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);
        currentPeriodEnd = new Date(sub.current_period_end * 1000);
        cancelAtPeriodEnd = sub.cancel_at_period_end;
      } catch (err) {
        console.error('Error fetching subscription from Stripe:', err);
      }
    }

    return {
      plan: tenant.plan,
      status: tenant.subscriptionStatus,
      currentPeriodEnd,
      cancelAtPeriodEnd
    };
  },

  async getUsage(tenantId: string): Promise<any> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let usage = await prisma.usageRecord.findFirst({
      where: {
        tenantId,
        periodStart: { lte: now },
        periodEnd: { gte: now }
      }
    });

    if (!usage) {
      usage = await prisma.usageRecord.create({
        data: {
          tenantId,
          periodStart,
          periodEnd
        }
      });
    }

    return {
      toolCallCount: usage.toolCallCount,
      llmTokensUsed: usage.llmTokensUsed,
      voiceMinutesUsed: usage.voiceMinutesUsed,
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd
    };
  },

  async incrementUsage(tenantId: string, toolCalls?: number, tokens?: number, voiceMinutes?: number): Promise<void> {
    const now = new Date();
    let usage = await prisma.usageRecord.findFirst({
      where: {
        tenantId,
        periodStart: { lte: now },
        periodEnd: { gte: now }
      }
    });

    if (!usage) {
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      usage = await prisma.usageRecord.create({
        data: { tenantId, periodStart, periodEnd }
      });
    }

    await prisma.usageRecord.update({
      where: { id: usage.id },
      data: {
        toolCallCount: { increment: toolCalls || 0 },
        llmTokensUsed: { increment: tokens || 0 },
        voiceMinutesUsed: { increment: voiceMinutes || 0 }
      }
    });
  }
};
