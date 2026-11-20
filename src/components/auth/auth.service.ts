import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/app-error.js';
import { objectInput, requiredText } from '../../shared/validation.js';
import { userRepository } from '../users/user.repository.js';

function validateEmail(value: unknown): string {
  const email = requiredText(value, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(400, 'El email debe tener un formato válido.');
  }
  return email;
}

function validatePassword(value: unknown, minimum: number): string {
  if (typeof value !== 'string' || value.length < minimum || Buffer.byteLength(value, 'utf8') > 72) {
    throw new AppError(400, `La contraseña debe tener al menos ${minimum} caracteres y un máximo de 72 bytes UTF-8.`);
  }
  return value;
}

export const authService = {
  async register(body: unknown) {
    const input = objectInput(body, ['name', 'email', 'password']);
    const name = requiredText(input.name, 'name', 80, 2);
    const email = validateEmail(input.email);
    const password = validatePassword(input.password, 8);
    if (await userRepository.findByEmail(email)) {
      throw new AppError(400, 'El email ya está registrado.');
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await userRepository.create({ name, email, password: hash });
    return { user: { _id: user._id, name: user.name, email: user.email } };
  },

  async login(body: unknown) {
    const input = objectInput(body, ['email', 'password']);
    const email = validateEmail(input.email);
    const password = validatePassword(input.password, 1);
    const user = await userRepository.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError(401, 'Email o contraseña incorrectos.');
    }
    const token = jwt.sign({}, env.jwtSecret, {
      subject: user._id.toString(), algorithm: 'HS256', expiresIn: '1h',
    });
    return { token, user: { _id: user._id, name: user.name, email: user.email } };
  },
};
