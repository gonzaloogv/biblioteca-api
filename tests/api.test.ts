import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Express } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { createMongoBookRepository } from '../src/components/books/book.repository.js';
import { UserModel } from '../src/components/users/user.model.js';
import { createContainer } from '../src/container.js';

let app: Express;
let database: MongoMemoryServer;
let token: string;
let bookId: string;
const secret = 'secreto-exclusivo-de-pruebas-que-no-se-usa-en-produccion';
const user = { name: 'Ana Pérez', email: 'ana@example.com', password: 'Biblioteca123!' };
const book = { title: 'El principito', author: 'Antoine de Saint-Exupéry', year: 1943, genre: 'Fantasía', available: true };

before(async () => {
  database = await MongoMemoryServer.create({ binary: { downloadDir: '.cache/mongodb' } });
  process.env.NODE_ENV = 'test';
  await mongoose.connect(database.getUri());
  app = createApp(createContainer({ jwtSecret: secret }));
}, { timeout: 180_000 });

after(async () => {
  await mongoose.disconnect();
  await database?.stop();
});

describe('Autenticación', () => {
  it('registra un usuario, devuelve 201 y guarda un hash bcrypt', async () => {
    const response = await request(app).post('/api/auth/register').send(user);
    assert.equal(response.status, 201);
    assert.equal(response.body.user.email, user.email);
    assert.equal(response.body.user.name, user.name);
    assert.equal(response.body.user.password, undefined);
    const saved = await mongoose.connection.collection('users').findOne({ email: user.email });
    assert.ok(saved);
    assert.notEqual(saved.password, user.password);
    assert.equal(await bcrypt.compare(user.password, saved.password), true);
  });

  it('rechaza un email duplicado aunque cambien mayúsculas y espacios', async () => {
    const response = await request(app).post('/api/auth/register').send({ ...user, email: ' ANA@EXAMPLE.COM ' });
    assert.equal(response.status, 400);
  });

  it('impide emails duplicados ante registros simultáneos', async () => {
    await UserModel.init();
    const simultaneousUser = { ...user, email: 'concurrencia@example.com' };
    const responses = await Promise.all([
      request(app).post('/api/auth/register').send(simultaneousUser),
      request(app).post('/api/auth/register').send(simultaneousUser),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 400]);
    assert.equal(await mongoose.connection.collection('users').countDocuments({ email: simultaneousUser.email }), 1);
  });

  it('rechaza registros con email inválido, nombre vacío o contraseña débil', async () => {
    for (const changes of [{ email: 'sin-arroba' }, { name: ' ' }, { password: '123' }, { password: 'á'.repeat(37) }, { role: 'admin' }]) {
      const response = await request(app).post('/api/auth/register').send({ ...user, ...changes });
      assert.equal(response.status, 400);
      assert.equal(typeof response.body.message, 'string');
    }
  });

  it('inicia sesión y emite un JWT sin datos sensibles', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: ' ANA@EXAMPLE.COM ', password: user.password });
    assert.equal(response.status, 200);
    token = response.body.token;
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    assert.equal(typeof payload, 'object');
    assert.ok(payload && typeof payload !== 'string');
    assert.equal(typeof payload.sub, 'string');
    assert.equal(payload.password, undefined);
    assert.equal(payload.email, undefined);
    assert.ok(payload.exp && payload.iat && payload.exp > payload.iat);
  });

  it('devuelve 401 con contraseña incorrecta o usuario inexistente', async () => {
    for (const credentials of [{ email: user.email, password: 'incorrecta' }, { email: 'nadie@example.com', password: user.password }]) {
      const response = await request(app).post('/api/auth/login').send(credentials);
      assert.equal(response.status, 401);
    }
  });

  it('devuelve 400 cuando faltan credenciales', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: user.email });
    assert.equal(response.status, 400);
  });
});

describe('Libros', () => {
  it('permite listar sin autenticación y empieza vacío', async () => {
    const response = await request(app).get('/api/books');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, []);
  });

  it('protege POST, PUT y DELETE sin JWT', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    for (const method of ['post', 'put', 'delete'] as const) {
      const path = method === 'post' ? '/api/books' : `/api/books/${id}`;
      const response = await request(app)[method](path).send(book);
      assert.equal(response.status, 401);
    }
  });

  it('rechaza tokens inválidos, vencidos, sin sujeto o con otro algoritmo', async () => {
    const invalidTokens = [
      'invalido',
      jwt.sign({ sub: new mongoose.Types.ObjectId().toString() }, secret, { expiresIn: -1 }),
      jwt.sign({}, secret),
      jwt.sign({ sub: new mongoose.Types.ObjectId().toString() }, secret, { algorithm: 'HS384' }),
      jwt.sign({ sub: new mongoose.Types.ObjectId().toString() }, 'una-firma-diferente'),
    ];
    for (const invalidToken of invalidTokens) {
      const response = await request(app).post('/api/books').set('Authorization', `Bearer ${invalidToken}`).send(book);
      assert.equal(response.status, 401);
    }
  });

  it('crea un libro con JWT y persiste sus datos', async () => {
    const response = await request(app).post('/api/books').set('Authorization', `Bearer ${token}`).send(book);
    assert.equal(response.status, 201);
    bookId = response.body._id;
    assert.ok(mongoose.isObjectIdOrHexString(bookId));
    assert.equal(response.body.title, book.title);
    const saved = await mongoose.connection.collection('books').findOne({ _id: new mongoose.Types.ObjectId(bookId) });
    assert.equal(saved?.author, book.author);
  });

  it('consulta un libro por id sin JWT', async () => {
    const response = await request(app).get(`/api/books/${bookId}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.title, book.title);
  });

  it('filtra género y disponibilidad, ignorando mayúsculas en el género', async () => {
    const found = await request(app).get('/api/books').query({ genre: 'fantasía', available: 'true' });
    assert.equal(found.status, 200);
    assert.equal(found.body.length, 1);
    const absent = await request(app).get('/api/books').query({ available: 'false' });
    assert.equal(absent.status, 200);
    assert.deepEqual(absent.body, []);
  });

  it('valida campos obligatorios, año, disponibilidad y campos desconocidos al crear', async () => {
    const invalidBooks = [
      {}, { ...book, title: ' ' }, { ...book, author: '' }, { ...book, genre: 123 },
      { ...book, year: new Date().getFullYear() + 1 }, { ...book, year: -1 },
      { ...book, year: 1943.5 }, { ...book, year: '1943' },
      { ...book, available: 'true' }, { ...book, $set: { available: false } },
      { ...book, title: 'x'.repeat(201) },
    ];
    for (const invalidBook of invalidBooks) {
      const response = await request(app).post('/api/books').set('Authorization', `Bearer ${token}`).send(invalidBook);
      assert.equal(response.status, 400, JSON.stringify(invalidBook));
      const update = await request(app).put(`/api/books/${bookId}`).set('Authorization', `Bearer ${token}`).send(invalidBook);
      assert.equal(update.status, 400, JSON.stringify(invalidBook));
    }
  });

  it('rechaza filtros inválidos y parámetros de consulta con objetos o listas', async () => {
    for (const query of ['available=quizas', 'genre[$ne]=x', 'genre=a&genre=b', 'unknown=x']) {
      const response = await request(app).get(`/api/books?${query}`);
      assert.equal(response.status, 400, query);
    }
  });

  it('distingue IDs inválidos (400) de libros inexistentes (404)', async () => {
    assert.equal((await request(app).get('/api/books/no-es-id')).status, 400);
    const missing = new mongoose.Types.ObjectId().toString();
    for (const method of ['get', 'put', 'delete'] as const) {
      const response = await request(app)[method](`/api/books/${missing}`).set('Authorization', `Bearer ${token}`).send(book);
      assert.equal(response.status, 404);
    }
  });

  it('exige todos los campos al reemplazar con PUT y conserva los datos si falla', async () => {
    const response = await request(app).put(`/api/books/${bookId}`).set('Authorization', `Bearer ${token}`).send({ title: 'Otro título' });
    assert.equal(response.status, 400);
    const unchanged = await request(app).get(`/api/books/${bookId}`);
    assert.equal(unchanged.body.title, book.title);
  });

  it('actualiza un libro completo y guarda disponibilidad false', async () => {
    const response = await request(app).put(`/api/books/${bookId}`).set('Authorization', `Bearer ${token}`).send({ ...book, available: false });
    assert.equal(response.status, 200);
    assert.equal(response.body.available, false);
    const updated = await request(app).get(`/api/books/${bookId}`);
    assert.equal(updated.body.available, false);
  });

  it('elimina un libro y luego devuelve 404', async () => {
    const response = await request(app).delete(`/api/books/${bookId}`).set('Authorization', `Bearer ${token}`);
    assert.equal(response.status, 200);
    assert.equal((await request(app).get(`/api/books/${bookId}`)).status, 404);
  });
});

describe('Errores HTTP', () => {
  it('responde 404 JSON en rutas inexistentes', async () => {
    const response = await request(app).get('/ruta-inexistente');
    assert.equal(response.status, 404);
    assert.match(response.headers['content-type'], /json/);
    assert.equal(typeof response.body.message, 'string');
  });

  it('responde 400 JSON ante un cuerpo JSON mal formado', async () => {
    const response = await request(app).post('/api/auth/register').set('Content-Type', 'application/json').send('{ roto');
    assert.equal(response.status, 400);
    assert.equal(typeof response.body.message, 'string');
    assert.equal(response.body.stack, undefined);
  });

  it('responde 400 si el cuerpo JSON es null o un arreglo', async () => {
    for (const body of ['null', '[]']) {
      const response = await request(app).post('/api/auth/register').set('Content-Type', 'application/json').send(body);
      assert.equal(response.status, 400);
    }
  });

  it('responde 500 sin filtrar detalles internos cuando falla el repositorio', async () => {
    // Gracias a la inyección de dependencias, se reemplaza el repositorio sin tocar el código de producción.
    const failingRepository = {
      ...createMongoBookRepository(),
      findAll: async () => {
        throw new Error('Error privado de la base de datos');
      },
    };
    const failingApp = createApp(createContainer({ jwtSecret: secret }, { bookRepository: failingRepository }));
    const response = await request(failingApp).get('/api/books');
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: 'Error interno del servidor.' });
  });
});
