import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { notFound } from './lib/errors.js';
import { loadUser } from './middlewares/auth.js';
import { errorHandler, originCheck } from './middlewares/security.js';
import { adminMasterRouter } from './modules/admin/admin.master.routes.js';
import { adminModerationRouter } from './modules/admin/admin.moderation.routes.js';
import { adminTransactionsRouter } from './modules/admin/admin.transactions.routes.js';
import { adminUsersRouter } from './modules/admin/admin.users.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { chatRouter } from './modules/chat/chat.routes.js';
import { cmsRouter } from './modules/cms/cms.routes.js';
import { disputesRouter } from './modules/disputes/disputes.routes.js';
import { meRouter } from './modules/me/me.routes.js';
import { offersRouter } from './modules/offers/offers.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';
import { publicRouter } from './modules/public/public.routes.js';
import { promotionsRouter } from './modules/store/promotions.routes.js';
import { storeRouter } from './modules/store/store.routes.js';
import { topupRouter } from './modules/topup/topup.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use(originCheck);
  app.use(loadUser);

  app.get('/api/health', async (_req, res) => {
    await pool.query('select 1');
    res.json({ ok: true, db: 'connected', paymentMode: env.PAYMENT_MODE });
  });

  const api = express.Router();
  api.use('/auth', authRouter);
  // Store owner routes first so /stores/me/* isn't read as a public store slug.
  api.use(storeRouter);
  api.use(promotionsRouter);
  api.use(offersRouter);
  api.use(ordersRouter);
  api.use(disputesRouter);
  api.use(chatRouter);
  api.use(meRouter);
  api.use(topupRouter);
  api.use(paymentsRouter);
  api.use(adminModerationRouter);
  api.use(adminTransactionsRouter);
  api.use(adminMasterRouter);
  api.use(adminUsersRouter);
  api.use(cmsRouter);
  api.use(publicRouter);
  app.use('/api', api);

  app.use((_req, _res, next) => next(notFound('Endpoint')));
  app.use(errorHandler);
  return app;
}
