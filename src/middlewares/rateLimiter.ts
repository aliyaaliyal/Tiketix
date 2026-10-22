import rateLimit from 'express-rate-limit';
import { sendError } from '../common/response';

// Global API Rate Limiter: max 300 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT !== 'true',
  handler: (_req, res) => {
    return sendError(
      res,
      'Terlalu banyak permintaan dari IP Anda. Silakan coba kembali beberapa saat lagi.',
      429,
      { code: 'RATE_LIMIT_EXCEEDED' }
    );
  },
});

// Strict Auth Rate Limiter: max 20 login/register attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT !== 'true',
  handler: (_req, res) => {
    return sendError(
      res,
      'Terlalu banyak percobaan autentikasi. Demi keamanan, silakan tunggu 15 menit.',
      429,
      { code: 'AUTH_RATE_LIMIT_EXCEEDED' }
    );
  },
});
