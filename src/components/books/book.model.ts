import { Schema, model } from 'mongoose';

const bookSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  author: { type: String, required: true, trim: true, maxlength: 120 },
  year: { type: Number, required: true, min: 1 },
  genre: { type: String, required: true, trim: true, maxlength: 60 },
  available: { type: Boolean, required: true },
}, { timestamps: true, versionKey: false });

export const BookModel = model('Book', bookSchema);
