import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // SEC-03: no weak default. Dev/test get a safe local default (>=32 chars);
  // production MUST provide JWT_SECRET or the process exits during boot.
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .default('tiketix-dev-only-secret-32-chars-minimum!!'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  // SEC-05: comma-separated allowlist, e.g. "http://localhost:5173,https://tiketix.id"
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

// SEC-03: fail-fast if production runs without an explicit secret.
if (parsedEnv.data.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not set. Refusing to boot in production.');
  console.error('   Generate one with: openssl rand -hex 32');
  process.exit(1);
}

export const env = parsedEnv.data;
