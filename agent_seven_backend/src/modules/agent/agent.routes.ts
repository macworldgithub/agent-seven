import { Router } from 'express';
import multer from 'multer';
import { agentController } from './agent.controller';
import { authenticate } from '../../middleware/auth';
import { agentChatRateLimit } from '../../middleware/rateLimit';

const router = Router();

// Multer: in-memory storage, max 10 MB per image
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

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

// Vision chat — accepts optional image upload via multipart/form-data
router.post('/chat/vision', agentChatRateLimit, upload.single('image'), agentController.chatWithVision);

export default router;
