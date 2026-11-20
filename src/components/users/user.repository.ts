import { User } from './user.model.js';

export const userRepository = {
  findByEmail(email: string) {
    return User.findOne({ email }).select('+password');
  },
  create(data: { name: string; email: string; password: string }) {
    return User.create(data);
  },
};
