import type { Types } from 'mongoose';
import { BookModel } from './book.model.js';
import type { Book, BookRepository } from './book.types.js';

type BookDocument = Omit<Book, '_id'> & { _id: Types.ObjectId };

function toBook({ _id, ...fields }: BookDocument): Book {
  return { _id: _id.toString(), ...fields };
}

/** Implementación de BookRepository con Mongoose. */
export function createMongoBookRepository(): BookRepository {
  return {
    async findAll(filters) {
      const books = await BookModel.find(filters)
        .collation({ locale: 'es', strength: 2 })
        .sort({ title: 1, _id: 1 })
        .lean<BookDocument[]>();
      return books.map(toBook);
    },

    async findById(id) {
      const book = await BookModel.findById(id).lean<BookDocument | null>();
      return book ? toBook(book) : null;
    },

    async create(data) {
      const book = await BookModel.create(data);
      return toBook(book.toObject<BookDocument>());
    },

    async update(id, data) {
      const book = await BookModel
        .findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true })
        .lean<BookDocument | null>();
      return book ? toBook(book) : null;
    },

    async remove(id) {
      const book = await BookModel.findByIdAndDelete(id).lean<BookDocument | null>();
      return book !== null;
    },
  };
}
