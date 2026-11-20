import { BadRequestError, UnauthorizedError } from '../../shared/app-error.js';
import { objectInput, requiredText } from '../../shared/validation.js';
import { EmailAlreadyRegisteredError } from '../users/user.errors.js';
import type { UserRepository } from '../users/user.types.js';
import type { PasswordHasher, TokenService } from './auth.types.js';

interface AuthDependencies {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
}

function validateEmail(value: unknown): string {
  const email = requiredText(value, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestError('El email debe tener un formato válido.');
  }
  return email;
}

function validatePassword(value: unknown, minimum: number): string {
  if (typeof value !== 'string' || value.length < minimum || Buffer.byteLength(value, 'utf8') > 72) {
    throw new BadRequestError(`La contraseña debe tener al menos ${minimum} caracteres y un máximo de 72 bytes UTF-8.`);
  }
  return value;
}

/** Registro y login. Depende de abstracciones: no conoce MongoDB, bcrypt ni jsonwebtoken. */
export function createAuthService({ userRepository, passwordHasher, tokenService }: AuthDependencies) {
  return {
    async register(body: unknown) {
      const input = objectInput(body, ['name', 'email', 'password']);
      const name = requiredText(input.name, 'name', 80, 2);
      const email = validateEmail(input.email);
      const password = validatePassword(input.password, 8);
      if (await userRepository.findByEmail(email)) {
        throw new EmailAlreadyRegisteredError();
      }
      const passwordHash = await passwordHasher.hash(password);
      const user = await userRepository.create({ name, email, passwordHash });
      return { user };
    },

    async login(body: unknown) {
      const input = objectInput(body, ['email', 'password']);
      const email = validateEmail(input.email);
      const password = validatePassword(input.password, 1);
      const credentials = await userRepository.findByEmail(email);
      if (!credentials || !(await passwordHasher.compare(password, credentials.passwordHash))) {
        throw new UnauthorizedError('Email o contraseña incorrectos.');
      }
      const user = { _id: credentials._id, name: credentials.name, email: credentials.email };
      return { token: tokenService.sign(user._id), user };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
