import { BadRequestError, NotFoundError } from '../../shared/app-error.js';
import { isObjectId, objectInput, requiredText } from '../../shared/validation.js';
import type { BookFilters, BookInput, BookRepository } from './book.types.js';

const BOOK_NOT_FOUND = 'Libro no encontrado.';

function validateId(id: unknown): string {
  if (!isObjectId(id)) {
    throw new BadRequestError('El id debe ser un ObjectId de 24 caracteres hexadecimales.');
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
    throw new BadRequestError(`year debe ser un entero entre 1 y ${currentYear}.`);
  }
  if (typeof input.available !== 'boolean') {
    throw new BadRequestError('available debe ser true o false, sin comillas.');
  }
  return { title, author, genre, year: input.year, available: input.available };
}

function validateFilters(query: unknown): BookFilters {
  const input = objectInput(query, ['genre', 'available']);
  const filters: BookFilters = {};
  if (input.genre !== undefined) filters.genre = requiredText(input.genre, 'genre', 60);
  if (input.available !== undefined) {
    if (input.available !== 'true' && input.available !== 'false') {
      throw new BadRequestError('El filtro available debe ser true o false.');
    }
    filters.available = input.available === 'true';
  }
  return filters;
}

/** Reglas de negocio de los libros. Recibe el repositorio por parámetro (inyección de dependencias). */
export function createBookService(repository: BookRepository) {
  return {
    async findAll(query: unknown) {
      return repository.findAll(validateFilters(query));
    },

    async findById(id: unknown) {
      const book = await repository.findById(validateId(id));
      if (!book) throw new NotFoundError(BOOK_NOT_FOUND);
      return book;
    },

    async create(body: unknown) {
      return repository.create(validateBook(body));
    },

    async update(id: unknown, body: unknown) {
      const validId = validateId(id);
      const data = validateBook(body);
      const book = await repository.update(validId, data);
      if (!book) throw new NotFoundError(BOOK_NOT_FOUND);
      return book;
    },

    async remove(id: unknown) {
      const removed = await repository.remove(validateId(id));
      if (!removed) throw new NotFoundError(BOOK_NOT_FOUND);
      return { message: 'Libro eliminado correctamente.' };
    },
  };
}

export type BookService = ReturnType<typeof createBookService>;
