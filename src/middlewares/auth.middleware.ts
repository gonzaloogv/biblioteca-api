import type { RequestHandler } from 'express';
import type { TokenService } from '../components/auth/auth.types.js';
import { UnauthorizedError } from '../shared/app-error.js';

/** Middleware que exige un token Bearer válido antes de continuar hacia el controlador. */
export function createAuthMiddleware(tokenService: TokenService): RequestHandler {
  return (req, _res, next) => {
    const match = req.get('Authorization')?.match(/^Bearer ([^\s]+)$/i);
    if (!match) {
      next(new UnauthorizedError('Se requiere un token Bearer válido.'));
      return;
    }
    if (!tokenService.verify(match[1])) {
      next(new UnauthorizedError('Token inválido o vencido.'));
      return;
    }
    next();
  };
}
