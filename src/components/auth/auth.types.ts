/** Calcula y compara hashes de contraseñas. */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

/** Emite y verifica tokens de sesión. */
export interface TokenService {
  sign(userId: string): string;
  /** Devuelve el ID del usuario si el token es válido, o null en cualquier otro caso. */
  verify(token: string): string | null;
}
