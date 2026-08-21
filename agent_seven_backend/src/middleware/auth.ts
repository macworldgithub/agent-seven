import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../config/db';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid Bearer token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);

    // Fetch fresh user data from DB to ensure real-time role/status checks
    const freshUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, tenantId: true, email: true, isOrgAdmin: true, isActive: true },
    });

    if (!freshUser) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User no longer exists' });
    }

    req.user = {
      ...payload,
      isOrgAdmin: freshUser.isOrgAdmin,
      isActive: freshUser.isActive,
    };
    req.tenantId = freshUser.tenantId;
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

