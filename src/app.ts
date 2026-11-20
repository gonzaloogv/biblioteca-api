import express, { type Express, type Router } from 'express';
import { errorHandler } from './middlewares/error.middleware.js';
import { requestLogger } from './middlewares/logger.middleware.js';
import { NotFoundError } from './shared/app-error.js';

export interface AppRouters {
  authRouter: Router;
  bookRouter: Router;
}

/** Configura Express. Recibe los routers ya armados, sin saber cómo se construyen. */
export function createApp({ authRouter, bookRouter }: AppRouters): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/auth', authRouter);
  app.use('/api/books', bookRouter);
  app.use((_req, _res, next) => {
    next(new NotFoundError('Ruta no encontrada.'));
  });
  app.use(errorHandler);
  return app;
}
