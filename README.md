# Directorio de funcionarios

Taller de Spring Boot: directorio web para registrar, consultar, editar y eliminar funcionarios.

- **Backend:** Java 21, Spring Boot 4 (MVC), Spring Data JPA, MySQL.
- **Seguridad:** Spring Security con HTTP Basic; los usuarios se guardan en la tabla `usuarios` con la contraseña cifrada (BCrypt).
- **Frontend:** HTML, CSS y JavaScript vanilla en `src/main/resources/static`, que consume la API.

## Cómo ejecutarlo

1. Configura la base de datos, de una de estas dos formas:
   - Copia `secrets.properties.example` como `secrets.properties` y escribe tus credenciales de MySQL.
   - O levanta un MySQL local con Docker: `docker compose up -d` (queda en el puerto 3307).
2. Arranca la aplicación:
   ```bash
   ./mvnw spring-boot:run
   ```
3. Abre http://localhost:8080 e inicia sesión. Al arrancar se crea el usuario `campus2023` (contraseña `campus2023`) si no existe.

Pruebas: `./mvnw test`.

## API REST

Ruta base: `/api/v1/funcionarios`. Todas las operaciones exigen HTTP Basic.

| Operación | Método y ruta | Respuesta |
|---|---|---|
| Listar | `GET /api/v1/funcionarios` | 200 con la lista, 204 si está vacío |
| Consultar por ID | `GET /api/v1/funcionarios/{id}` | 200, 404 si no existe |
| Registrar | `POST /api/v1/funcionarios` | 201 con el funcionario creado |
| Actualizar | `PUT /api/v1/funcionarios/{id}` | 200, 404 si no existe |
| Eliminar | `DELETE /api/v1/funcionarios/{id}` | 204, 404 si no existe |
| Buscar por nombre | `GET /api/v1/funcionarios?nombre=ana` | 200, 204 sin resultados |
| Filtrar por departamento | `GET /api/v1/funcionarios?departamento=Contabilidad` | 200, 204 sin resultados |

Responde 400 si falta un campo obligatorio (`nombre`, `cargo`, `departamento`), si viene vacío o solo con espacios, o si se envía un `id` no nulo al registrar. Sin credenciales válidas responde 401.

Ejemplo:

```bash
curl -u campus2023:campus2023 http://localhost:8080/api/v1/funcionarios
```
