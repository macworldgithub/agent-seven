import { Router } from 'express';
import { agentQueue, briefingQueue } from '../../config/queues';

const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  try {
    const agentQueueCount = await agentQueue.getJobCounts();
    const briefingQueueCount = await briefingQueue.getJobCounts();
    res.json({
      success: true,
      data: {
        status: 'ok',
        queues: {
          agent: agentQueueCount,
          briefing: briefingQueueCount
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Queue health check failed'
    });
  }
});

export default healthRouter;
