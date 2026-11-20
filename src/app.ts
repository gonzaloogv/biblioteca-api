import express from 'express';
import { authRouter } from './components/auth/auth.routes.js';
import { bookRouter } from './components/books/book.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { requestLogger } from './middlewares/logger.middleware.js';

export const app = express();
app.disable('x-powered-by');
app.use(requestLogger);
app.use(express.json({ limit: '100kb' }));
app.use('/api/auth', authRouter);
app.use('/api/books', bookRouter);
app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada.' });
});
app.use(errorHandler);
