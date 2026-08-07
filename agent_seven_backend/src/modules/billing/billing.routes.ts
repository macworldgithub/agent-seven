import { Router } from 'express';
import { billingController } from './billing.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Webhook for Stripe signature validation. No auth middleware.
router.post('/webhook', billingController.handleWebhook);

// Protected routes
router.use(authenticate);
router.get('/subscription', billingController.getSubscription);
router.get('/usage', billingController.getUsage);
router.post('/checkout', billingController.createCheckoutSession);
router.post('/portal', billingController.createBillingPortalSession);

export default router;
