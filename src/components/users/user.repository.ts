import type { Types } from 'mongoose';
import { EmailAlreadyRegisteredError } from './user.errors.js';
import { UserModel } from './user.model.js';
import type { UserRepository } from './user.types.js';

const DUPLICATE_KEY_ERROR = 11000;

interface UserDocument {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === DUPLICATE_KEY_ERROR;
}

/** Implementación de UserRepository con Mongoose. En la base, el campo password guarda el hash. */
export function createMongoUserRepository(): UserRepository {
  return {
    async findByEmail(email) {
      const user = await UserModel.findOne({ email }).select('+password').lean<UserDocument | null>();
      if (!user) return null;
      return { _id: user._id.toString(), name: user.name, email: user.email, passwordHash: user.password };
    },

    async create({ name, email, passwordHash }) {
      try {
        const user = await UserModel.create({ name, email, password: passwordHash });
        return { _id: user._id.toString(), name: user.name, email: user.email };
      } catch (error) {
        // El índice único resuelve dos registros simultáneos con el mismo email.
        if (isDuplicateKeyError(error)) throw new EmailAlreadyRegisteredError();
        throw error;
      }
    },
  };
}
