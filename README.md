# Biblioteca API

Trabajo práctico integrador de Node.js: API REST para administrar un catálogo de libros.

Tecnologías: Node.js, TypeScript, Express, MongoDB con Mongoose, bcrypt, jsonwebtoken y dotenv. La API permite consultar libros sin iniciar sesión; crear, reemplazar y eliminar requiere un JWT válido.

## 1. Instalar

Requisitos: Node.js 24 (recomendado) o la rama 22 desde 22.13, npm, una base MongoDB Atlas y Thunder Client en el editor para las pruebas manuales.

Abrí esta carpeta en VS Code y ejecutá en la terminal:

```powershell
npm ci
Copy-Item .env.example .env
```

En macOS/Linux, usá `cp .env.example .env` para el segundo comando. El archivo `.env.example` contiene los nombres de las variables sin valores, como pide la consigna.

## 2. Configurar MongoDB y las variables

En MongoDB Atlas:

1. Creá un proyecto y un clúster, si todavía no tenés uno.
2. Creá un usuario de **base de datos** con acceso a la base. Es distinto del usuario con el que entrás a Atlas.
3. Permití tu IP actual en el acceso de red del proyecto.
4. En la conexión para aplicaciones/Drivers, copiá la cadena `mongodb+srv://...` y completá el usuario, la contraseña y el nombre de base `biblioteca`. Si la contraseña contiene caracteres especiales, deben estar codificados para una URL.

Completá tu `.env`:

```dotenv
MONGO_URI=<tu cadena de conexión a la base biblioteca>
JWT_SECRET=<tu secreto aleatorio de al menos 32 caracteres>
PORT=3000
```

Los textos entre `<...>` son indicaciones: reemplazalos por tus valores. Generá tu propio secreto con:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Si ya tenés MongoDB instalado localmente, para desarrollo podés usar `mongodb://127.0.0.1:27017/biblioteca`. Para la entrega, configurá Atlas como indica la opción MongoDB de la consigna.

`.env` está excluido de Git. No pegues credenciales de Atlas ni tokens reales en el README, en la colección o en las capturas. La aplicación valida las variables al iniciar y usa el puerto 3000 si `PORT` está vacío.

## 3. Ejecutar

Durante el desarrollo:

```powershell
npm run dev
```

Para ejecutar el JavaScript compilado:

```powershell
npm run build
npm start
```

La API escucha en `http://localhost:3000`. Primero se conecta a MongoDB y prepara el índice único del email; recién después abre el puerto HTTP. Es una API, por lo que no tiene una página web: abrí `/api/books` para ver el catálogo en JSON. Se detiene con `Ctrl+C`.

## 4. Estructura y responsabilidades

```text
src/
  app.ts                         # Configura Express y sus middlewares
  server.ts                      # Conecta la base e inicia el servidor
  config/
    env.ts                       # Lee y valida las variables de entorno
    database.ts                  # Conexión a MongoDB
  components/
    auth/
      auth.routes.ts             # Registro y login
      auth.controller.ts         # Lee la petición y responde; usa try/catch
      auth.service.ts            # Valida, aplica bcrypt y genera el JWT
    users/
      user.model.ts              # Modelo User de Mongoose
      user.repository.ts         # Acceso a los usuarios en MongoDB
    books/
      book.routes.ts             # Endpoints del CRUD
      book.controller.ts         # Controladores con try/catch
      book.service.ts            # Reglas de negocio y validaciones
      book.repository.ts         # Consultas a MongoDB
      book.model.ts              # Modelo Book y tipos de entrada
  middlewares/
    auth.middleware.ts           # Verifica el JWT antes de escribir
    error.middleware.ts          # Respuestas de error uniformes en JSON
    logger.middleware.ts         # Método, ruta y estado de cada petición
  shared/
    app-error.ts                 # Error con código HTTP y mensaje público
    validation.ts                # Validaciones pequeñas compartidas
tests/
  api.test.ts                    # Pruebas HTTP contra MongoDB temporal
  collection.test.ts             # Verifica el flujo de la colección por HTTP
  logger.test.ts                 # Comprueba la ruta registrada y la omisión de queries
thunder-client/
  biblioteca.collection.json     # Colección de peticiones y aserciones
  local.environment.json         # Variables locales sin secretos reales
docs/
  guia-de-estudio.md              # Explicación del código y práctica sugerida
```

Ejemplo de flujo: `PUT /api/books/:id` → middleware JWT → controlador → servicio (valida ID y libro) → repositorio → MongoDB. La respuesta recorre el camino de vuelta. Si hay un error, el `catch` del controlador lo pasa a `next(error)` y el middleware de errores responde.

## 5. Modelos y validaciones

### User

| Campo | Regla |
| --- | --- |
| `name` | Texto de 2 a 80 caracteres; se recortan espacios externos |
| `email` | Formato válido, hasta 254 caracteres, único y normalizado a minúsculas |
| `password` | Al registrarse: mínimo 8 caracteres y máximo 72 bytes UTF-8 |

La contraseña se guarda como un **hash bcrypt con costo 10**. No se devuelve en las respuestas. El máximo de bytes evita la truncación de bcrypt, especialmente con tildes o emojis. Las contraseñas no se recortan: los espacios forman parte de ellas.

### Book

| Campo | Tipo | Regla en el servicio |
| --- | --- | --- |
| `title` | string | Obligatorio, de 1 a 200 caracteres |
| `author` | string | Obligatorio, de 1 a 120 caracteres |
| `year` | number | Entero entre 1 y el año actual; no se aceptan años futuros |
| `genre` | string | Obligatorio, de 1 a 60 caracteres |
| `available` | boolean | Obligatorio, `true` o `false` sin comillas |

Se recortan los espacios externos de título, autor y género. No se aceptan propiedades desconocidas. Ambos modelos agregan `_id`, `createdAt` y `updatedAt` automáticamente. Cada registro representa una entrada del catálogo; no se modelan ejemplares, préstamos ni devoluciones. Se permiten títulos repetidos.

`PUT` reemplaza los cinco campos del libro: hay que enviarlos todos. Las reglas se aplican tanto al crear como al modificar. Un ID con formato inválido devuelve 400; un ID válido que no existe devuelve 404.

## 6. Endpoints

| Método | Ruta | ¿JWT? | Éxito |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | 201 |
| POST | `/api/auth/login` | No | 200 |
| GET | `/api/books` | No | 200 |
| GET | `/api/books/:id` | No | 200 |
| POST | `/api/books` | Sí | 201 |
| PUT | `/api/books/:id` | Sí | 200 |
| DELETE | `/api/books/:id` | Sí | 200 |

Registro:

```json
{
  "name": "Ana Pérez",
  "email": "ana@example.com",
  "password": "Biblioteca123!"
}
```

Devuelve `{ "user": { "_id": "...", "name": "Ana Pérez", "email": "ana@example.com" } }`. Son datos de ejemplo para las pruebas locales.

Login:

```json
{
  "email": "ana@example.com",
  "password": "Biblioteca123!"
}
```

Devuelve `{ "token": "...", "user": { "_id": "...", "name": "...", "email": "..." } }`. El JWT dura una hora y contiene solamente el ID del usuario (`sub`) y las fechas de emisión/vencimiento (`iat`/`exp`). Se firma y verifica con HS256. Un JWT está firmado, pero su contenido no está cifrado.

Para las tres rutas protegidas, agregá:

```http
Authorization: Bearer <token devuelto por el login>
Content-Type: application/json
```

Cuerpo para crear o actualizar un libro:

```json
{
  "title": "El principito",
  "author": "Antoine de Saint-Exupéry",
  "year": 1943,
  "genre": "Fantasía",
  "available": true
}
```

Crear, consultar por ID y actualizar devuelven el documento del libro. Listar devuelve un arreglo (vacío si no hay coincidencias). Eliminar devuelve `{ "message": "Libro eliminado correctamente." }`.

Cualquier usuario autenticado puede crear, actualizar y eliminar cualquier libro del catálogo. Esta versión no tiene roles ni propiedad de libros por usuario.

### Filtros opcionales

```http
GET /api/books?genre=Fantas%C3%ADa
GET /api/books?available=true
GET /api/books?genre=Fantas%C3%ADa&available=false
```

El género se compara completo, ignorando mayúsculas y respetando acentos. La lista se ordena por título. Los filtros se pueden combinar; no se aceptan parámetros desconocidos, repetidos, ni valores de `available` diferentes de `true` y `false`.

### Errores

Siempre se devuelve un objeto con `message`:

```json
{ "message": "Libro no encontrado." }
```

| Código | Caso |
| --- | --- |
| 400 | Datos, filtros o JSON inválidos, email duplicado o ID mal formado |
| 401 | Credenciales incorrectas, falta de token, token inválido o vencido |
| 404 | Libro o ruta inexistentes |
| 500 | Error interno inesperado; se ocultan detalles internos |

Si falta el token en una escritura, se responde 401 antes de validar el libro. El logging muestra método, ruta y estado, sin cuerpos, contraseñas ni tokens.

## 7. Probar en Thunder Client

1. Iniciá la API con tu `.env` configurado.
2. En Thunder Client, importá `thunder-client/biblioteca.collection.json` desde **Collections → menú → Import**.
3. Importá `thunder-client/local.environment.json` y activá el entorno **Biblioteca local**. Si cambiaste el puerto, modificá `baseUrl`.
4. Ejecutá las peticiones en orden numérico. La colección verifica el estado esperado en cada una. El login guarda `token` y la creación de un libro guarda `bookId` mediante las aserciones de variables del entorno activo.
5. Si tu versión no guarda esas variables al importar, copiá manualmente `token` de la respuesta del login y `_id` de la creación a las variables `token` y `bookId`.
6. Al terminar, exportá la colección desde Thunder Client o capturá las respuestas de todos los endpoints, incluidos 400, 401 y 404, para la entrega.

La colección crea y luego elimina su libro de prueba. También crea un usuario de ejemplo: en la primera ejecución el registro devuelve 201. En ejecuciones posteriores con el mismo email devolverá 400; para repetir todo, cambiá `email` en el entorno por otro email de ejemplo. Si el token vence, repetí el login. Para la captura del 400 por año futuro se usa 9999.

La colección está preparada y su flujo se verifica por HTTP en las pruebas automatizadas. La importación y las capturas dentro de la interfaz de Thunder Client deben completarse en tu editor.

Referencia de importación: [documentación oficial de Thunder Client](https://docs.thunderclient.com/features/import). Las aserciones `res-code` y `set-env-var` siguen el [esquema oficial](https://github.com/thunderclient/thunderclient-mcp/blob/main/src/tools/definitions.ts).

## 8. Verificaciones automáticas

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

O todas juntas:

```powershell
npm run check
```

Las pruebas levantan una instancia **real y temporal de MongoDB** con `mongodb-memory-server`, aislada de Atlas y de tu `.env`. La primera vez descargan el ejecutable de MongoDB, que puede superar los 700 MB en Windows, y requieren internet. En las siguientes ejecuciones se reutiliza la caché `.cache/mongodb`. Los datos de las pruebas se eliminan al finalizar.

Cubren registro, hash bcrypt, email duplicado, login, JWT, lectura pública, escritura protegida, CRUD persistido, filtros, reglas de negocio y errores 400/401/404/500. Solo el caso 500 simula un fallo del repositorio para comprobar la respuesta ante errores internos.

## 9. Correspondencia con la consigna

| Requisito | Dónde verlo |
| --- | --- |
| Node.js + Express + TypeScript por componentes | `package.json`, `tsconfig.json`, `src/components/` |
| MongoDB/Mongoose y modelos User + Book | `src/config/database.ts`, archivos `*.model.ts` |
| Los cinco endpoints CRUD | `src/components/books/book.routes.ts` |
| Rutas, controlador, servicio, acceso a datos | Archivos separados dentro de cada componente |
| Dos o más validaciones de negocio | `book.service.ts`: textos, año y disponibilidad |
| Bcrypt + JWT | `src/components/auth/auth.service.ts` |
| Escrituras protegidas | `auth.middleware.ts` y `book.routes.ts` |
| Estados 200, 201, 400, 401, 404 y 500 | Controladores, middleware de errores y pruebas |
| Try/catch en todos los controladores | `auth.controller.ts` y `book.controller.ts` |
| dotenv, secretos y `.env.example` sin valores | `env.ts`, `.gitignore`, `.env.example` |
| README y pruebas Thunder Client | Este archivo y `thunder-client/` |
| Extras implementados | Filtros con `req.query` y middleware de logging |

## 10. Preparar la entrega

- Configurar y comprobar la conexión con tu MongoDB Atlas.
- Ejecutar las verificaciones y las peticiones de Thunder Client.
- Completar tus datos de autor en la presentación de la entrega.
- Crear un repositorio de GitHub y subir el código, el lockfile, el README, `.env.example` y la colección exportada o las capturas. Antes de subir, verificá que `.env` y `node_modules` estén excluidos.
- Entregar el enlace del repositorio. Esta carpeta no crea ni publica un repositorio remoto automáticamente.
