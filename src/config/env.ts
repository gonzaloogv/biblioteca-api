import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function requiredVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta configurar ${name} en el archivo .env.`);
  return value;
}

const mongoUri = requiredVariable('MONGO_URI');
const jwtSecret = requiredVariable('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
}

const port = Number(process.env.PORT?.trim() || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un entero entre 1 y 65535.');
}

export const env = { mongoUri, jwtSecret, port };
