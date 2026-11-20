# Cómo entender y explicar tu API

## Recorrido recomendado

1. Abrí `src/container.ts`. Es el *composition root*: crea los repositorios, el hasher y el servicio de tokens, y se los pasa a los servicios. Es el único archivo que conoce Mongoose, bcrypt y jsonwebtoken a la vez.
2. Abrí `src/components/books/book.routes.ts`. Ahí están los cinco endpoints y la protección JWT de las tres escrituras.
3. Seguí `create` en `book.controller.ts`. El controlador toma `req.body`, llama al servicio y decide el estado 201. Su `catch` deriva el error con `next(error)`.
4. Abrí `book.service.ts`. `validateBook` comprueba los datos antes de tocar la base: un año futuro o un título vacío provocan un `BadRequestError` (400). El servicio recibe un `BookRepository` por parámetro y no importa nada de MongoDB.
5. Mirá `book.types.ts`. La interfaz `BookRepository` es el contrato que el servicio necesita. `book.repository.ts` lo implementa con Mongoose y convierte los documentos en objetos simples.
6. Mirá `book.model.ts`. El esquema define cómo se guarda un libro en MongoDB. Las reglas del servicio siguen siendo necesarias: el esquema de Mongoose puede convertir tipos y el servicio exige el contrato HTTP exacto.
7. Volvé a `app.ts` para entender el orden de los middlewares. El manejo de errores va al final y recibe cuatro argumentos, como requiere Express.

## Registro y login

En el registro, el servicio valida nombre, email y contraseña. Busca si el email ya existe, calcula el hash con el `PasswordHasher` (bcrypt con costo 10, en `password-hasher.ts`) y guarda el usuario. Además de la comprobación previa, el índice único impide emails duplicados ante peticiones simultáneas: el repositorio traduce ese error a `EmailAlreadyRegisteredError`. El repositorio devuelve solo los campos públicos.

En el login, busca al usuario y compara con `passwordHasher.compare`. No se descifra la contraseña guardada: bcrypt comprueba si corresponde al hash. Si coincide, el `TokenService` (`token.service.ts`) firma un JWT con el ID del usuario y vencimiento de una hora.

Cuando llega una escritura, el middleware creado por `createAuthMiddleware` busca `Authorization: Bearer ...` y le pide al `TokenService` que verifique firma, algoritmo, vencimiento y que el sujeto sea un ID válido. Si falla, responde 401. Si funciona, llama a `next()` y continúa hacia el controlador.

## Por qué separar las capas

- Las rutas relacionan URLs y funciones, y deciden qué middleware se ejecuta.
- Los controladores trabajan con HTTP: petición, estado y respuesta.
- Los servicios contienen las reglas de la aplicación.
- Los repositorios consultan la base.
- Los modelos describen los documentos persistidos.

Por ejemplo, cambiar la regla del año no requiere modificar una ruta; cambiar el orden de consulta afecta al repositorio. Esta separación permite leer y probar cada responsabilidad sin mezclarla con las otras.

## Principios SOLID, explicados con este código

- **S, responsabilidad única.** `auth.service.ts` decide si las credenciales son válidas, pero no sabe calcular un hash ni firmar un JWT: eso lo hacen `password-hasher.ts` y `token.service.ts`.
- **O, abierto/cerrado.** En `error.middleware.ts`, cada tipo de error tiene un *mapper* en una lista. Para un error nuevo se agrega un elemento a la lista y el handler no cambia.
- **L, sustitución de Liskov.** `NotFoundError` es un `AppError`. El middleware de errores no necesita saber qué subclase recibe: usa `statusCode` y `message` de cualquiera.
- **I, segregación de interfaces.** `PasswordHasher` tiene solo `hash` y `compare`, y `TokenService` solo `sign` y `verify`. Cada consumidor depende de lo justo.
- **D, inversión de dependencias.** `createBookService(repository)` recibe una `BookRepository`, no importa `book.repository.ts`. Las piezas se conectan en `container.ts`.

Pregunta típica: *¿Para qué sirve la inversión de dependencias?* Para cambiar una implementación sin tocar las reglas de negocio. Por ejemplo, la prueba del error 500 en `tests/api.test.ts` arma la app con un repositorio que falla a propósito. Para pasar a PostgreSQL alcanzaría con escribir otro `BookRepository` y cambiar una línea en `container.ts`.

## Ejercicio para comprobar que lo entendiste

1. Registrá un usuario e iniciá sesión.
2. Intentá crear un libro sin token: debe responder 401.
3. Agregá el token y enviá un año futuro: debe responder 400.
4. Corregí el año y creá el libro: debe responder 201.
5. Consultá ese libro por ID sin token: debe responder 200.
6. Reemplazá el libro con PUT y `available: false`, enviando los cinco campos.
7. Listá con `?available=false` y comprobá que aparezca.
8. Eliminá el libro con token y consultalo otra vez: debe responder 404.

Antes de modificar código, intentá ubicar en qué archivo se resuelve cada paso.

## Preguntas para practicar la explicación

- ¿Qué diferencia hay entre un error 400 y uno 404 al buscar un libro?
- ¿Por qué GET puede ser público y POST requiere JWT?
- ¿Qué diferencia hay entre autenticación y permisos? En este trabajo, todos los usuarios autenticados tienen los mismos permisos de escritura.
- ¿Qué devuelve un controlador cuando el servicio lanza un error? El controlador llama a `next(error)` y el middleware construye la respuesta.
- ¿Por qué no se debe guardar ni devolver la contraseña original?
- ¿Por qué no alcanza con comprobar que el header Authorization exista?
- ¿Qué cambia entre ejecutar TypeScript con `npm run dev` y JavaScript compilado con `npm start`?
- ¿Por qué `.env` no se sube a Git y `.env.example` sí?

## Alcance

La disponibilidad es un booleano del catálogo. No hay un sistema de préstamos, reservas ni control de ejemplares. No hay roles, frontend ni endpoints adicionales de usuarios. Los extras elegidos son filtros y logging.

Las pruebas temporales confirman el comportamiento del código contra MongoDB local. La conectividad de tu cuenta Atlas depende de tu propia configuración y se comprueba al iniciar la API con tu `.env`.
