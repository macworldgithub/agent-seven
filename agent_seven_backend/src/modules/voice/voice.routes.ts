import { Router } from 'express';
import { voiceController } from './voice.controller';
import { authenticate } from '../../middleware/auth';
import multer from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(authenticate);

router.post('/message', upload.single('file'), voiceController.processVoiceMessage);
router.post('/stream', voiceController.streamVoiceResponse);
router.get('/voices', voiceController.getVoices);
router.post('/transcribe', upload.single('file'), voiceController.transcribe);

export default router;
