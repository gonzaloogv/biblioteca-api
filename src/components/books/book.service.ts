import mongoose from 'mongoose';
import { AppError } from '../../shared/app-error.js';
import { objectInput, requiredText } from '../../shared/validation.js';
import type { BookFilters, BookInput } from './book.model.js';
import { bookRepository } from './book.repository.js';

function validateId(id: unknown): string {
  if (typeof id !== 'string' || !mongoose.isObjectIdOrHexString(id)) {
    throw new AppError(400, 'El id debe ser un ObjectId de 24 caracteres hexadecimales.');
  }
  return id;
}

function validateBook(body: unknown): BookInput {
  const input = objectInput(body, ['title', 'author', 'year', 'genre', 'available']);
  const title = requiredText(input.title, 'title', 200);
  const author = requiredText(input.author, 'author', 120);
  const genre = requiredText(input.genre, 'genre', 60);
  const currentYear = new Date().getFullYear();
  if (typeof input.year !== 'number' || !Number.isInteger(input.year) || input.year < 1 || input.year > currentYear) {
    throw new AppError(400, `year debe ser un entero entre 1 y ${currentYear}.`);
  }
  if (typeof input.available !== 'boolean') {
    throw new AppError(400, 'available debe ser true o false, sin comillas.');
  }
  return { title, author, genre, year: input.year, available: input.available };
}

export const bookService = {
  async findAll(query: unknown) {
    const input = objectInput(query, ['genre', 'available']);
    const filters: BookFilters = {};
    if (input.genre !== undefined) filters.genre = requiredText(input.genre, 'genre', 60);
    if (input.available !== undefined) {
      if (input.available !== 'true' && input.available !== 'false') {
        throw new AppError(400, 'El filtro available debe ser true o false.');
      }
      filters.available = input.available === 'true';
    }
    return bookRepository.findAll(filters);
  },

  async findById(id: unknown) {
    const book = await bookRepository.findById(validateId(id));
    if (!book) throw new AppError(404, 'Libro no encontrado.');
    return book;
  },

  async create(body: unknown) {
    return bookRepository.create(validateBook(body));
  },

  async update(id: unknown, body: unknown) {
    const validId = validateId(id);
    const data = validateBook(body);
    const book = await bookRepository.update(validId, data);
    if (!book) throw new AppError(404, 'Libro no encontrado.');
    return book;
  },

  async remove(id: unknown) {
    const book = await bookRepository.remove(validateId(id));
    if (!book) throw new AppError(404, 'Libro no encontrado.');
    return { message: 'Libro eliminado correctamente.' };
  },
};
