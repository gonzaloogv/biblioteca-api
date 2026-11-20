import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AppError } from '../shared/app-error.js';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const authorization = req.get('Authorization');
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match) {
    next(new AppError(401, 'Se requiere un token Bearer válido.'));
    return;
  }
  try {
    const payload = jwt.verify(match[1], env.jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !mongoose.isObjectIdOrHexString(payload.sub)) {
      throw new Error('El token no identifica a un usuario.');
    }
    next();
  } catch {
    next(new AppError(401, 'Token inválido o vencido.'));
  }
};
