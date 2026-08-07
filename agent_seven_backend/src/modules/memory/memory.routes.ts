import { Router } from 'express';
import { memoryController } from './memory.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/summary', memoryController.getMemorySummary);
router.get('/export', memoryController.exportMemories);
router.delete('/wipe', memoryController.wipeMemories);
router.get('/action-items', memoryController.getActionItems);
router.post('/action-items', memoryController.createActionItem);
router.patch('/action-items/:id', memoryController.updateActionItem);
router.delete('/action-items/:id', memoryController.deleteActionItem);

router.get('/', memoryController.getMemories);
router.post('/', memoryController.createMemory);
router.get('/:id', memoryController.getMemoryById);
router.patch('/:id', memoryController.updateMemory);
router.delete('/:id', memoryController.deleteMemory);

export default router;
