import bcrypt from 'bcrypt';
import type { PasswordHasher } from './auth.types.js';

/** Implementación de PasswordHasher con bcrypt. */
export function createBcryptPasswordHasher(rounds = 10): PasswordHasher {
  return {
    hash: (password) => bcrypt.hash(password, rounds),
    compare: (password, hash) => bcrypt.compare(password, hash),
  };
}
