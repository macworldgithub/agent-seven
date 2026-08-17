import { Router } from 'express';
import { driveController } from './drive.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All Drive routes require authentication
router.use(authenticate);

router.get('/files', driveController.listFiles);
router.get('/search', driveController.searchFiles);
router.get('/files/:fileId', driveController.getFile);
router.post('/documents', driveController.createDocument);
router.post('/generate', driveController.generateDocument);

export default router;
