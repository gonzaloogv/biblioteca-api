import { Book, type BookFilters, type BookInput } from './book.model.js';

export const bookRepository = {
  findAll(filters: BookFilters) {
    return Book.find(filters).collation({ locale: 'es', strength: 2 }).sort({ title: 1, _id: 1 }).lean();
  },
  findById(id: string) {
    return Book.findById(id).lean();
  },
  create(data: BookInput) {
    return Book.create(data);
  },
  update(id: string, data: BookInput) {
    return Book.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true }).lean();
  },
  remove(id: string) {
    return Book.findByIdAndDelete(id).lean();
  },
};
