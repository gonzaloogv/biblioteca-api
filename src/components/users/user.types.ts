/** Datos públicos de un usuario: nunca incluyen la contraseña. */
export interface User {
  _id: string;
  name: string;
  email: string;
}

/** Usuario con su hash, solo para comprobar credenciales en el login. */
export interface UserCredentials extends User {
  passwordHash: string;
}

export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
}

/** Contrato de persistencia que necesita el servicio de autenticación. */
export interface UserRepository {
  findByEmail(email: string): Promise<UserCredentials | null>;
  create(data: NewUser): Promise<User>;
}
