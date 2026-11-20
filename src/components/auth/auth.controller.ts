import type { RequestHandler } from 'express';
import { authService } from './auth.service.js';

export const register: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await authService.register(req.body));
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    res.status(200).json(await authService.login(req.body));
  } catch (error) {
    next(error);
  }
};
