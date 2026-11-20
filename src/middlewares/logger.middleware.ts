import type { RequestHandler } from 'express';

export const requestLogger: RequestHandler = (req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    const { method, path } = req;
    res.on('finish', () => console.log(`${method} ${path} ${res.statusCode}`));
  }
  next();
};
