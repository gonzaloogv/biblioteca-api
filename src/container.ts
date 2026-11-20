import type { AppRouters } from './app.js';
import { createAuthController } from './components/auth/auth.controller.js';
import { createAuthRouter } from './components/auth/auth.routes.js';
import { createAuthService } from './components/auth/auth.service.js';
import { createBcryptPasswordHasher } from './components/auth/password-hasher.js';
import { createJwtTokenService } from './components/auth/token.service.js';
import { createBookController } from './components/books/book.controller.js';
import { createMongoBookRepository } from './components/books/book.repository.js';
import { createBookRouter } from './components/books/book.routes.js';
import { createBookService } from './components/books/book.service.js';
import type { BookRepository } from './components/books/book.types.js';
import { createMongoUserRepository } from './components/users/user.repository.js';
import type { UserRepository } from './components/users/user.types.js';
import { createAuthMiddleware } from './middlewares/auth.middleware.js';

export interface ContainerConfig {
  jwtSecret: string;
}

/** Permite reemplazar la persistencia, por ejemplo en las pruebas. */
export interface ContainerOverrides {
  bookRepository?: BookRepository;
  userRepository?: UserRepository;
}

/**
 * Composition root: el único lugar que conoce las implementaciones concretas
 * (Mongoose, bcrypt, jsonwebtoken) y las conecta con las capas que dependen de interfaces.
 */
export function createContainer(config: ContainerConfig, overrides: ContainerOverrides = {}): AppRouters {
  const bookRepository = overrides.bookRepository ?? createMongoBookRepository();
  const userRepository = overrides.userRepository ?? createMongoUserRepository();
  const passwordHasher = createBcryptPasswordHasher();
  const tokenService = createJwtTokenService(config.jwtSecret);

  const authService = createAuthService({ userRepository, passwordHasher, tokenService });
  const bookService = createBookService(bookRepository);
  const requireAuth = createAuthMiddleware(tokenService);

  return {
    authRouter: createAuthRouter(createAuthController(authService)),
    bookRouter: createBookRouter(createBookController(bookService), requireAuth),
  };
}
