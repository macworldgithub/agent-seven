import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.tenantId) {
    return res.status(400).json({ success: false, error: 'Bad Request: Tenant ID is missing' });
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
    });

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    if (tenant.subscriptionStatus === 'CANCELLED') {
      return res.status(403).json({ success: false, error: 'Forbidden: Tenant is inactive (CANCELLED)' });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    next(error);
  }
};
