import { BadRequestError } from './app-error.js';

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

export function objectInput(value: unknown, allowedFields: string[]): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestError('El cuerpo debe ser un objeto JSON.');
  }
  const input = value as Record<string, unknown>;
  const unknownFields = Object.keys(input).filter((key) => !allowedFields.includes(key));
  if (unknownFields.length > 0) {
    throw new BadRequestError(`Campos no permitidos: ${unknownFields.join(', ')}.`);
  }
  return input;
}

export function requiredText(value: unknown, field: string, maxLength: number, minLength = 1): string {
  if (typeof value !== 'string' || value.trim().length < minLength || value.trim().length > maxLength) {
    throw new BadRequestError(`${field} debe ser un texto de ${minLength} a ${maxLength} caracteres.`);
  }
  return value.trim();
}

/** Indica si el valor es un identificador de 24 caracteres hexadecimales. */
export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}
