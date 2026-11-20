import { Schema, model } from 'mongoose';

const bookSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  author: { type: String, required: true, trim: true, maxlength: 120 },
  year: { type: Number, required: true, min: 1 },
  genre: { type: String, required: true, trim: true, maxlength: 60 },
  available: { type: Boolean, required: true },
}, { timestamps: true, versionKey: false });

export interface BookInput {
  title: string;
  author: string;
  year: number;
  genre: string;
  available: boolean;
}

export interface BookFilters {
  genre?: string;
  available?: boolean;
}

export const Book = model('Book', bookSchema);
