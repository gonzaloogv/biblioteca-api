import type { RequestHandler } from 'express';
import type { AuthService } from './auth.service.js';

export function createAuthController(service: AuthService) {
  const register: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json(await service.register(req.body));
    } catch (error) {
      next(error);
    }
  };

  const login: RequestHandler = async (req, res, next) => {
    try {
      res.status(200).json(await service.login(req.body));
    } catch (error) {
      next(error);
    }
  };

  return { register, login };
}

export type AuthController = ReturnType<typeof createAuthController>;
