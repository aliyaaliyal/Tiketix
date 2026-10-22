import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { globalLimiter } from './middlewares/rateLimiter';
import { sendSuccess } from './common/response';
import { setupSwagger } from './config/swagger';

import path from 'path';

export function createApp(): Application {
  const app = express();

  // Security and utilities middleware
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // SEC-05: restrict CORS to explicit allowlist instead of `*`.
  // Supports comma-separated origins via FRONTEND_URL.
  const allowedOrigins = env.FRONTEND_URL.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow same-origin / non-browser clients (no Origin header) and allowlisted origins.
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin '${origin}' is not allowed by CORS policy`));
      },
      credentials: true,
    })
  );
  app.use(globalLimiter);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static directory for uploaded files (posters, banners)
  // SEC-05: deny dotfiles and enable caching to reduce hotlink/enumeration abuse.
  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads'), {
      dotfiles: 'deny',
      maxAge: '7d',
      index: false,
    })
  );

  // Interactive Swagger API Documentation
  setupSwagger(app);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    return sendSuccess(res, {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'tiketix-backend',
    }, 'Server is healthy');
  });

  // API v1 routes
  app.use('/api/v1', apiRouter);

  // Global error handler
  app.use(errorHandler);

  return app;
}
