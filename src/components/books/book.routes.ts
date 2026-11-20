import { Router, type RequestHandler } from 'express';
import type { BookController } from './book.controller.js';

export function createBookRouter(controller: BookController, requireAuth: RequestHandler): Router {
  const router = Router();
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', requireAuth, controller.create);
  router.put('/:id', requireAuth, controller.update);
  router.delete('/:id', requireAuth, controller.remove);
  return router;
}
