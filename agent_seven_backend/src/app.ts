import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { globalRateLimit } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './modules/auth/auth.routes';
import workspaceRouter from './modules/workspace/workspace.routes';
import agentRouter from './modules/agent/agent.routes';
import memoryRouter from './modules/memory/memory.routes';
import voiceRouter from './modules/voice/voice.routes';
import billingRouter from './modules/billing/billing.routes';
import { agentQueue, briefingQueue } from './config/queues';
import path from 'path';

const app = express();

app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',
  env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}));
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(globalRateLimit);

app.use('/audio', express.static(path.join(process.cwd(), 'public/audio')));

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/workspaces', workspaceRouter);
app.use('/api/agent', agentRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/billing', billingRouter);

app.get('/api/health', async (req, res) => {
  const agentQueueCount = await agentQueue.getJobCounts()
  const briefingQueueCount = await briefingQueue.getJobCounts()
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
  })
})

app.use(errorHandler);

export default app;
