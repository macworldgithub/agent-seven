import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ] : ['error'],
});

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

if (env.NODE_ENV === 'development') {
  // @ts-ignore Prisma types don't always correctly infer event-based logging
  prisma.$on('query', (e: any) => {
    if (e.duration >= 5000) {
      logger.warn(`Slow query: ${e.query} took ${e.duration}ms`);
    }
  });
}
