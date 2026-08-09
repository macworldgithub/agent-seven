import { Request, Response } from 'express';
import { billingService } from './billing.service';

export const billingController = {
  async getPlans(req: Request, res: Response) {
    try {
      const plans = [
        {
          id: 'STARTER',
          name: 'Starter',
          price: 29,
          interval: 'month',
          features: [
            '200 AI actions per day',
            'Up to 3 workspaces',
            'Gmail, Calendar, Drive, Slack',
            'Memory & action items',
            'Morning briefing',
            'Email support'
          ],
          limits: { toolCallsPerDay: 200, workspaces: 3 }
        },
        {
          id: 'PRO',
          name: 'Pro',
          price: 79,
          interval: 'month',
          features: [
            '1,000 AI actions per day',
            'Up to 10 workspaces',
            'Everything in Starter',
            'Voice interface',
            'Priority support',
            'Advanced memory'
          ],
          limits: { toolCallsPerDay: 1000, workspaces: 10 }
        },
        {
          id: 'ENTERPRISE',
          name: 'Enterprise',
          price: 199,
          interval: 'month',
          features: [
            'Unlimited AI actions',
            'Unlimited workspaces',
            'Everything in Pro',
            'Custom integrations',
            'Dedicated support',
            'SLA guarantee'
          ],
          limits: { toolCallsPerDay: 999999, workspaces: 999 }
        }
      ];
      res.json({ success: true, data: plans });
    } catch (err: any) {
      console.error('Error in getPlans:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getSubscription(req: Request, res: Response) {
    try {
      const { tenantId } = req.user!;
      const data = await billingService.getSubscription(tenantId);
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('Error in getSubscription:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getUsage(req: Request, res: Response) {
    try {
      const { tenantId } = req.user!;
      const data = await billingService.getUsage(tenantId);
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('Error in getUsage:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async createCheckoutSession(req: Request, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { plan } = req.body;
      
      if (!plan) return res.status(400).json({ success: false, error: 'Plan is required' });

      const data = await billingService.createCheckoutSession(tenantId, plan);
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('Error in createCheckoutSession:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async createBillingPortalSession(req: Request, res: Response) {
    try {
      const { tenantId } = req.user!;
      const data = await billingService.createBillingPortalSession(tenantId);
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('Error in createBillingPortalSession:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async handleWebhook(req: Request, res: Response) {
    try {
      const sig = req.headers['stripe-signature'];
      if (!sig) return res.status(400).send('Webhook Error: Missing signature');

      const rawBody = (req as any).rawBody;
      if (!rawBody) return res.status(400).send('Webhook Error: Missing raw body');

      await billingService.handleWebhook(rawBody, sig as string);
      res.json({ received: true });
    } catch (err: any) {
      console.error('Error in handleWebhook:', err);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
};
