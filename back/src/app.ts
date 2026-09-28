import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { notFound } from './lib/errors.js';
import { loadUser } from './middlewares/auth.js';
import { errorHandler, originCheck } from './middlewares/security.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { meRouter } from './modules/me/me.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';
import { storesRouter } from './modules/stores/stores.routes.js';
import { topupRouter } from './modules/topup/topup.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(originCheck);
  app.use(loadUser);

  app.get('/api/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected', paymentMode: env.PAYMENT_MODE });
  });

  const api = express.Router();
  api.use('/auth', authRouter);
  api.use(storesRouter); // before catalogRouter so /stores/me isn't read as a slug
  api.use(catalogRouter);
  api.use(topupRouter);
  api.use(paymentsRouter);
  api.use(ordersRouter);
  api.use(meRouter);
  api.use(adminRouter);
  app.use('/api', api);

  app.use((_req, _res, next) => next(notFound('Endpoint')));
  app.use(errorHandler);
  return app;
}
