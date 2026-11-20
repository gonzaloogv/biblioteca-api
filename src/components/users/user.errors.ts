import { BadRequestError } from '../../shared/app-error.js';

export class EmailAlreadyRegisteredError extends BadRequestError {
  constructor() {
    super('El email ya está registrado.');
  }
}
