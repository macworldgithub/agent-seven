import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`);

  let statusCode = 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code;

  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'Unique constraint failed';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Unauthorized: Invalid or expired token';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
