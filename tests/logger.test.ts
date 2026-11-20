import assert from 'node:assert/strict';
import { it } from 'node:test';
import express, { Router } from 'express';
import request from 'supertest';
import { requestLogger } from '../src/middlewares/logger.middleware.js';

it('registra la ruta completa de un router sin incluir valores de consulta', async (context) => {
  const originalEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  context.after(() => {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
  });
  const lines: string[] = [];
  context.mock.method(console, 'log', (...values: unknown[]) => lines.push(values.join(' ')));
  const app = express();
  const router = Router();
  app.use(requestLogger);
  router.get('/', (_req, res) => { res.status(200).json([]); });
  app.use('/api/books', router);

  const response = await request(app).get('/api/books?token=valor-privado');
  assert.equal(response.status, 200);
  assert.deepEqual(lines, ['GET /api/books 200']);
});
