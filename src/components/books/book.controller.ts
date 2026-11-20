import type { RequestHandler } from 'express';
import { bookService } from './book.service.js';

export const listBooks: RequestHandler = async (req, res, next) => {
  try {
    res.status(200).json(await bookService.findAll(req.query));
  } catch (error) {
    next(error);
  }
};

export const getBook: RequestHandler = async (req, res, next) => {
  try {
    res.status(200).json(await bookService.findById(req.params.id));
  } catch (error) {
    next(error);
  }
};

export const createBook: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await bookService.create(req.body));
  } catch (error) {
    next(error);
  }
};

export const updateBook: RequestHandler = async (req, res, next) => {
  try {
    res.status(200).json(await bookService.update(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};

export const deleteBook: RequestHandler = async (req, res, next) => {
  try {
    res.status(200).json(await bookService.remove(req.params.id));
  } catch (error) {
    next(error);
  }
};
