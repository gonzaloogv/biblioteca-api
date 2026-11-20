import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, it } from 'node:test';
import type { Express } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

interface CollectionRequest {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers: { name: string; value: string }[];
  body?: { raw: string };
  tests: { type: string; custom: string; action: string; value: string }[];
}

let database: MongoMemoryServer;
let app: Express;

before(async () => {
  database = await MongoMemoryServer.create({ binary: { downloadDir: '.cache/mongodb' } });
  process.env.MONGO_URI = database.getUri();
  process.env.JWT_SECRET = 'otro-secreto-exclusivo-de-pruebas-para-la-coleccion';
  process.env.NODE_ENV = 'test';
  await mongoose.connect(database.getUri());
  ({ app } = await import('../src/app.js'));
}, { timeout: 180_000 });

after(async () => {
  await mongoose.disconnect();
  await database?.stop();
});

it('ejecuta todas las peticiones de la colección y captura token y bookId', async () => {
  const collection = JSON.parse(await readFile(new URL('../thunder-client/biblioteca.collection.json', import.meta.url), 'utf8'));
  const environment = JSON.parse(await readFile(new URL('../thunder-client/local.environment.json', import.meta.url), 'utf8'));
  assert.equal(collection.client, 'Thunder Client');
  const variables = Object.fromEntries(environment.variables.map((item: { name: string; value: string }) => [item.name, item.value])) as Record<string, string>;

  function interpolate(value: string): string {
    return value.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
      assert.ok(name in variables, `Falta la variable ${name}`);
      return variables[name];
    });
  }

  for (const entry of collection.requests as CollectionRequest[]) {
    const url = new URL(interpolate(entry.url));
    const method = entry.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
    let operation = request(app)[method](url.pathname + url.search);
    for (const header of entry.headers) operation = operation.set(header.name, interpolate(header.value));
    if (entry.body) operation = operation.send(interpolate(entry.body.raw));
    const response = await operation;

    for (const assertion of entry.tests) {
      if (assertion.type === 'res-code') {
        assert.equal(response.status, Number(assertion.value), entry.name);
      } else if (assertion.type === 'set-env-var') {
        const field = assertion.custom.replace(/^json\./, '');
        const variable = assertion.value.replace(/^\{\{|\}\}$/g, '');
        assert.equal(typeof response.body[field], 'string', entry.name);
        variables[variable] = response.body[field];
      } else {
        assert.fail(`Tipo de aserción no verificado: ${assertion.type}`);
      }
    }
  }

  assert.ok(variables.token);
  assert.ok(mongoose.isObjectIdOrHexString(variables.bookId));
  assert.equal(await mongoose.connection.collection('books').countDocuments(), 0);
});
