import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { matchRouter } from './routes/match.routes';
import { companyRouter } from './routes/company.routes';
import { checkRouter } from './routes/check.routes';
import { env } from './config/env';
import { authRouter } from './routes/auth.routes';
import { applicationRouter } from './routes/application.routes';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';

// brute-force guard for the credential endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, try again in 15 minutes' } },
});

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/applications', applicationRouter);
  app.use('/api/companies', companyRouter);
  app.use('/api/checks', checkRouter);
  app.use('/api/match', matchRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
