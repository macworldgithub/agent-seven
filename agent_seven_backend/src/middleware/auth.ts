import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid Bearer token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    req.tenantId = payload.tenantId;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireOrgAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isOrgAdmin) {
    return res.status(403).json({ success: false, error: 'Forbidden: Organization Admin access required' });
  }
  next();
};
