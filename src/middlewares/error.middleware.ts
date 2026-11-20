import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../shared/app-error.js';

interface ErrorResponse {
  status: number;
  message: string;
}

/** Traduce un tipo de error a una respuesta HTTP, o devuelve undefined si no lo reconoce. */
type ErrorMapper = (error: unknown) => ErrorResponse | undefined;

function hasBodyParserType(error: unknown, type: string): boolean {
  return error instanceof Error && 'type' in error && error.type === type;
}

// Para soportar un error nuevo se agrega un mapper a la lista, sin modificar el handler.
const errorMappers: ErrorMapper[] = [
  (error) => (error instanceof AppError ? { status: error.statusCode, message: error.message } : undefined),
  (error) => (hasBodyParserType(error, 'entity.parse.failed')
    ? { status: 400, message: 'El cuerpo contiene JSON inválido.' }
    : undefined),
  (error) => (hasBodyParserType(error, 'entity.too.large')
    ? { status: 400, message: 'El cuerpo supera el tamaño permitido de 100 KB.' }
    : undefined),
  (error) => (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError
    ? { status: 400, message: 'Los datos enviados no son válidos.' }
    : undefined),
];

const internalError: ErrorResponse = { status: 500, message: 'Error interno del servidor.' };

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  for (const toResponse of errorMappers) {
    const response = toResponse(error);
    if (response) {
      res.status(response.status).json({ message: response.message });
      return;
    }
  }
  // No devolver detalles internos, contraseñas ni cadenas de conexión al cliente.
  if (process.env.NODE_ENV !== 'test') console.error('Error interno al procesar la petición.');
  res.status(internalError.status).json({ message: internalError.message });
};
