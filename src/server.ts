import mongoose from 'mongoose';
import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { User } from './components/users/user.model.js';

async function main(): Promise<void> {
  await connectDatabase();
  await User.init();
  const server = app.listen(env.port, () => {
    console.log(`Biblioteca API disponible en http://localhost:${env.port}`);
  });

  server.on('error', () => {
    console.error('No se pudo abrir el puerto HTTP. Revisá PORT.');
    void mongoose.disconnect();
    process.exitCode = 1;
  });

  function shutdown(): void {
    server.close(() => { void mongoose.disconnect(); });
  }
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch(async () => {
  console.error('No se pudo iniciar la API. Revisá MONGO_URI, las credenciales y el acceso de red a MongoDB.');
  await mongoose.disconnect();
  process.exitCode = 1;
});
