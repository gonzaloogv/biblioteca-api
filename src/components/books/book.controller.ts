import type { RequestHandler } from 'express';
import type { BookService } from './book.service.js';

/** Traduce HTTP a llamadas del servicio. Cada handler deriva los errores al middleware con next(error). */
export function createBookController(service: BookService) {
  const list: RequestHandler = async (req, res, next) => {
    try {
      res.status(200).json(await service.findAll(req.query));
    } catch (error) {
      next(error);
    }
  };

  const getById: RequestHandler = async (req, res, next) => {
    try {
      res.status(200).json(await service.findById(req.params.id));
    } catch (error) {
      next(error);
    }
  };

  const create: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json(await service.create(req.body));
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      res.status(200).json(await service.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  };

  const remove: RequestHandler = async (req, res, next) => {
    try {
      res.status(200).json(await service.remove(req.params.id));
    } catch (error) {
      next(error);
    }
  };

  return { list, getById, create, update, remove };
}

export type BookController = ReturnType<typeof createBookController>;
