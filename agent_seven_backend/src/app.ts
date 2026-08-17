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
import driveRouter from './modules/drive/drive.routes';
import triageRouter from './modules/triage/triage.routes';
import healthRouter from './modules/health/health.routes';
import { agentQueue, briefingQueue } from './config/queues';
import path from 'path';

const app = express();

app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://agent-seven-eight.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS blocked: ${origin}`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', "PATCH", 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
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
app.use('/api/drive', driveRouter);
app.use('/api/triage', triageRouter);
app.use('/api/health', healthRouter);

app.use(errorHandler);

export default app;
