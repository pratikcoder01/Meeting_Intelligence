import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

// ─── Singleton PrismaClient ───────────────────────────────────────────────────
// Using a module-level singleton prevents connection pool exhaustion during
// hot-reloads in development (ts-node-dev re-imports modules on each change).

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  const client = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
    errorFormat: 'pretty',
  });

  // Forward Prisma logs to Winston
  client.$on('query' as never, (e: { query: string; duration: number }) => {
    logger.debug('Prisma Query', { query: e.query, duration: `${e.duration}ms` });
  });

  client.$on('error' as never, (e: { message: string }) => {
    logger.error('Prisma Error', { message: e.message });
  });

  client.$on('warn' as never, (e: { message: string }) => {
    logger.warn('Prisma Warning', { message: e.message });
  });

  return client;
};

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__prisma = prisma;
}

// ─── Connection Helpers ───────────────────────────────────────────────────────
export const connectDatabase = async (): Promise<void> => {
  await prisma.$connect();
  logger.info('Database connection established');
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('Database connection closed');
};
