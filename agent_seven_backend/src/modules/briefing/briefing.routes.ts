import { Router } from 'express';
import { briefingController } from './briefing.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Order matters: specific routes before parameterized ones
router.get('/latest', briefingController.getLatestBriefing);
router.get('/history', briefingController.getBriefingHistory);
router.get('/status', briefingController.getBriefingStatus);
router.post('/trigger', briefingController.triggerBriefing);
router.get('/:id', briefingController.getBriefingById);

export default router;
