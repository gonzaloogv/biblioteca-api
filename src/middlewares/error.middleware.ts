import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../shared/app-error.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }
  if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'El cuerpo contiene JSON inválido.' });
    return;
  }
  if (error instanceof Error && 'type' in error && error.type === 'entity.too.large') {
    res.status(400).json({ message: 'El cuerpo supera el tamaño permitido de 100 KB.' });
    return;
  }
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: 'Los datos enviados no son válidos.' });
    return;
  }
  if (error instanceof Error && 'code' in error && error.code === 11000) {
    res.status(400).json({ message: 'El email ya está registrado.' });
    return;
  }
  // No devolver detalles internos, contraseñas ni cadenas de conexión al cliente.
  if (process.env.NODE_ENV !== 'test') console.error('Error interno al procesar la petición.');
  res.status(500).json({ message: 'Error interno del servidor.' });
};
