import rateLimit from 'express-rate-limit';

// General API rate limit — generous enough to handle React StrictMode double-mounts
// and multi-step onboarding flows without false 429s.
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
});

// Strict limit only for auth endpoints (login/register)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-user rate limit for agent chat to prevent abuse
export const agentChatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { success: false, error: 'Too many agent requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.id || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
});

/** @deprecated use agentChatRateLimit */
export const agentRateLimit = agentChatRateLimit;
