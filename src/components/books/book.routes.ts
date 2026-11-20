import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { createBook, deleteBook, getBook, listBooks, updateBook } from './book.controller.js';

export const bookRouter = Router();
bookRouter.get('/', listBooks);
bookRouter.get('/:id', getBook);
bookRouter.post('/', requireAuth, createBook);
bookRouter.put('/:id', requireAuth, updateBook);
bookRouter.delete('/:id', requireAuth, deleteBook);
