import { AppError } from './app-error.js';

export function objectInput(value: unknown, allowedFields: string[]): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(400, 'El cuerpo debe ser un objeto JSON.');
  }
  const input = value as Record<string, unknown>;
  const unknownFields = Object.keys(input).filter((key) => !allowedFields.includes(key));
  if (unknownFields.length > 0) {
    throw new AppError(400, `Campos no permitidos: ${unknownFields.join(', ')}.`);
  }
  return input;
}

export function requiredText(value: unknown, field: string, maxLength: number, minLength = 1): string {
  if (typeof value !== 'string' || value.trim().length < minLength || value.trim().length > maxLength) {
    throw new AppError(400, `${field} debe ser un texto de ${minLength} a ${maxLength} caracteres.`);
  }
  return value.trim();
}
