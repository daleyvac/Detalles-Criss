# 🛍️ Tienda Online — Entorno local y arquitectura

Proyecto de e-commerce artesanal (bombas de baño, sets y velas) con catálogo,
carrito de compras, finalización por WhatsApp y panel de administrador.
**Diseño intacto**: colores (#fc5da5), tipografías y tamaños originales.

## 🚀 Cómo ejecutarlo en local

```bash
# 1. Requisitos: Node.js 18+ (probado con v20)
node --version

# 2. Instalar dependencias
npm install

# 3. Configurar entorno (opcional, hay valores por defecto)
cp .env.example .env    # ajusta puerto, clave admin y número de WhatsApp

# 4. Levantar el servidor
npm start               # o "npm run dev" con recarga automática (--watch)

# 5. Abrir en el navegador
#    http://localhost:3000            -> página principal
#    http://localhost:3000/compras.html -> catálogo + carrito + panel admin
```

Credenciales admin semilla: `admin / admin123` (cámbialas en `.env` antes de la primera ejecución).

```bash
npm test                # 14 pruebas de integración de la API
```

La primera vez que arranca se crea automáticamente la base SQLite `db/tienda.db`
con categorías, productos de ejemplo y el usuario admin.

## 🏗️ Arquitectura (capas)

```
/workspace
├── public/                  # FRONTEND (se sirve estáticamente, diseño original)
│   ├── index.html           #   landing
│   ├── compras.html         #   catálogo + carrito + panel admin
│   ├── css/ js/ img/ assets/#   estilos, scripts e imágenes
├── server/                  # BACKEND (Node + Express)
│   ├── index.js             #   entrada: middlewares, rutas estáticas, API
│   ├── db.js                #   CAPA DATOS: SQLite + esquema + semilla
│   ├── middleware/auth.js   #   CAPA SEGURIDAD: login/logout, token, rol admin
│   └── routes/
│       ├── auth.routes.js   #   POST /api/auth/login | /logout
│       ├── catalogo.js      #   CRUD público/admin de productos y categorías
│       └── pedidos.js       #   creación pública de pedidos; gestión admin
├── tests/api.test.js        # PRUEBAS de integración (fetch contra el server real)
├── db/tienda.db             # base de datos local (generada, en .gitignore)
├── uploads/                 # imágenes subidas por el admin (servidas en /uploads)
├── .env.example             # plantilla de configuración del entorno
└── package.json             # scripts: start / dev / test
```

### Flujo de una petición
1. **Cliente** abre `/compras.html` → el front pide `GET /api/productos` y `GET /api/categorias` (públicos).
2. Agrega al carrito (persistido en localStorage) y finaliza → `POST /api/pedidos` (**el servidor recalcula precios y total desde la BD**, nunca confía en el front) → se guarda en SQLite y se genera la boleta de WhatsApp.
3. **Admin** inicia sesión (`POST /api/auth/login`, contraseña verificada con bcrypt) → recibe un token → todas sus operaciones (`PUT /api/productos/:id`, `POST /api/categorias`, etc.) pasan por el middleware `requiereAdmin` (403 si no hay token válido).
4. El admin consulta `GET /api/pedidos` y confirma/anula con `PATCH /api/pedidos/:id/estado`.

### Decisiones de arquitectura
- **Separación de capas**: rutas (HTTP) → middleware (autorización) → db.js (datos). Ningún archivo mezcla responsabilidades.
- **SQLite (better-sqlite3)**: cero configuración, un solo archivo, ideal para local; sincroniza bien a PostgreSQL/MySQL después.
- **API REST JSON** desacoplada del HTML: el mismo backend servirá una app móvil futura.
- **Seguridad mínima viable**: hash bcrypt de contraseñas, tokens de sesión en memoria, validación y recálculo de totales en servidor, rutas de escritura protegidas por rol.
- **Frontend intocado**: se copió tal cual a `public/`; solo los colores/tamaños/diseño siguen idénticos.

## 🔌 Endpoints principales

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | /api/auth/login | público | Login admin, devuelve token |
| GET | /api/productos | público | Catálogo con categoría |
| GET | /api/categorias | público | Apartados del catálogo |
| POST/PUT/DELETE | /api/productos[/:id] | admin | Crear / cambiar precio-imagen / eliminar |
| POST/DELETE | /api/categorias[/:id] | admin | Crear/eliminar apartado |
| POST | /api/pedidos | público | Finalizar compra (recalcula total) |
| GET | /api/pedidos | admin | Ver pedidos |
| PATCH | /api/pedidos/:id/estado | admin | Confirmar/anular |

## 📌 Próximos pasos sugeridos (cuando quieras escalar)
- Subir el frontend a consumir la API (hoy usa localStorage; el backend ya está listo).
- Reemplazar tokens en memoria por JWT + expiración.
- Servidor de archivos para subir imágenes reales (`multer` → `uploads/`).
- Despliegue gratuito: Render/Railway (mismo `npm start`).

## 🗄️ Activar SQL Server (local)

1. Levantar el contenedor: `docker compose -f db/sqlserver/docker-compose.yml up -d`
2. Ejecutar los scripts en orden (sqlcmd o SSMS): `01_crear_base_datos.sql` → `02_datos_semilla.sql` → `03_vistas_y_procedimientos.sql`
3. En `.env`: `DB_DRIVER=mssql` y las variables `MSSQL_*` (ver `.env.example`)
4. `npm start` → el banner mostrará `(BD: SQL Server)`
