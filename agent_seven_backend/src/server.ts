import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/db';
import { redis } from './config/redis';

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL');
    
    // Redis connects automatically, but we log status
    logger.info(`Redis client status: ${redis.status}`);

    const server = app.listen(env.PORT, () => {
      logger.info(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });

    // Start workers (only in non-test environment)
    if (env.NODE_ENV !== 'test') {
      import('./workers/index');
    }

    const gracefulShutdown = async () => {
      logger.info('Graceful shutdown initiated...');
      server.close(async () => {
        logger.info('HTTP server closed');
        await prisma.$disconnect();
        logger.info('Prisma disconnected');
        await redis.quit();
        logger.info('Redis disconnected');
        process.exit(0);
      });
      
      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forcefully terminating due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error: any) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
