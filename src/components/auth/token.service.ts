import jwt, { type Algorithm } from 'jsonwebtoken';
import { isObjectId } from '../../shared/validation.js';
import type { TokenService } from './auth.types.js';

const ALGORITHM: Algorithm = 'HS256';
const EXPIRES_IN = '1h';

/** Implementación de TokenService con JWT. El token solo contiene el ID del usuario (sub), iat y exp. */
export function createJwtTokenService(secret: string): TokenService {
  return {
    sign(userId) {
      return jwt.sign({}, secret, { subject: userId, algorithm: ALGORITHM, expiresIn: EXPIRES_IN });
    },

    verify(token) {
      try {
        const payload = jwt.verify(token, secret, { algorithms: [ALGORITHM] });
        return typeof payload !== 'string' && isObjectId(payload.sub) ? payload.sub : null;
      } catch {
        return null;
      }
    },
  };
}
