import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
        email: string;
        isOrgAdmin: boolean;
      };
      tenantId?: string;
      tenant?: any;
    }
  }
}
