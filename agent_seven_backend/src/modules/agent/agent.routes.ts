import { Router } from 'express';
import { agentController } from './agent.controller';
import { authenticate } from '../../middleware/auth';
import { agentChatRateLimit } from '../../middleware/rateLimit';

const router = Router();

router.use(authenticate);

// Config & conversation reads — no strict rate limit (lightweight DB queries)
router.get('/', agentController.getOrCreateAgent);
router.patch('/config', agentController.updateAgentConfig);
router.get('/conversations', agentController.getConversations);
router.get('/conversations/:id/messages', agentController.getConversationMessages);
router.delete('/conversations/:id', agentController.deleteConversation);

// Chat endpoints — rate-limited per user to prevent LLM abuse
router.post('/chat', agentChatRateLimit, agentController.runAgentLoop);
router.post('/chat/stream', agentChatRateLimit, agentController.runAgentLoop);

export default router;
