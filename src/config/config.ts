import 'dotenv/config';
import { z } from 'zod';

// ─── Environment Schema ──────────────────────────────────────────────────────
// All environment variables are validated at startup. If any required variable
// is missing or malformed, the process exits immediately with a clear error.

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_VERSION: z.string().default('v1'),
  SERVICE_NAME: z.string().default('meeting-intelligence-service'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  JWT_ISSUER: z.string().default('meeting-intelligence-service'),
  JWT_AUDIENCE: z.string().default('meeting-intelligence-clients'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3001'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // Bcrypt
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // File Upload
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(100),
  UPLOAD_DIR: z.string().default('uploads'),
});

// ─── Parse & Validate ────────────────────────────────────────────────────────
const _parseResult = envSchema.safeParse(process.env);

if (!_parseResult.success) {
  const formatted = _parseResult.error.format();
  console.error('❌  Invalid environment configuration:\n', JSON.stringify(formatted, null, 2));
  process.exit(1);
}

const env = _parseResult.data;

// ─── Derived / Computed Config ───────────────────────────────────────────────
export const config = {
  app: {
    env: env.NODE_ENV,
    port: env.PORT,
    apiVersion: env.API_VERSION,
    serviceName: env.SERVICE_NAME,
    logLevel: env.LOG_LEVEL,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',
  },

  database: {
    url: env.DATABASE_URL,
  },

  jwt: {
    secret: env.JWT_SECRET,
    accessTokenExpiry: env.JWT_ACCESS_TOKEN_EXPIRY,
    refreshTokenExpiry: env.JWT_REFRESH_TOKEN_EXPIRY,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  },

  cors: {
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true as const,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as string[],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'] as string[],
    exposedHeaders: ['X-Request-Id', 'X-Rate-Limit-Remaining'] as string[],
    maxAge: 86400, // 24h preflight cache
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
  },

  bcrypt: {
    saltRounds: env.BCRYPT_SALT_ROUNDS,
  },

  upload: {
    maxFileSizeMb: env.MAX_FILE_SIZE_MB,
    uploadDir: env.UPLOAD_DIR,
  },
} as const;

export type Config = typeof config;
