# core

Núcleo seguro de **AZONLINE** — monorepo con backend Bun y frontend React 19.

🌐 **Producción:** https://core.azonline.com.ar
📚 **API docs (Swagger):** https://core.azonline.com.ar/api/docs

## Stack

**Backend** (`/backend`) — el mejor stack Bun a la fecha:
- [Bun](https://bun.sh) + [Elysia](https://elysiajs.com) — runtime y framework
- [Drizzle ORM](https://orm.drizzle.team) sobre `bun:sqlite` — type-safe, con migraciones
- [Eden Treaty](https://elysiajs.com/eden/treaty/overview) — cliente RPC con type-safety **end-to-end**
- Swagger / OpenAPI auto-generado

**Frontend** (`/frontend`):
- React 19 + Vite 8 + SCSS (arquitectura modular)
- Consume el backend con Eden Treaty (tipos compartidos, sin DTOs manuales)

## Seguridad

- Hashing **Argon2id** (`Bun.password`, recomendado OWASP)
- JWT en **cookie httpOnly + Secure + SameSite=Strict** (inmune a robo por XSS)
- Bloqueo **anti fuerza bruta** (5 intentos → cuenta bloqueada 15 min)
- **Rate-limit** por IP
- Headers de seguridad estrictos (CSP, nosniff, frame-DENY, no-store)
- Defensa de **timing** en el login
- **Audit log** de eventos de seguridad

## Desarrollo

### Backend

```bash
cd backend
bun install
cp .env.example .env          # y completá JWT_SECRET (openssl rand -hex 48)
bun run db:migrate            # aplica las migraciones de Drizzle
USERNAME=admin PASSWORD=tu-clave-segura bun run seed   # crea el primer usuario
bun run dev                   # http://127.0.0.1:3005
```

### Frontend

```bash
cd frontend
bun install
bun run dev                   # Vite; proxy /api → backend en :3005
```

### Build de producción

```bash
cd frontend && bun run build  # genera dist/ (servido por nginx)
```

## Despliegue

- Backend gestionado por **PM2** (`backend/ecosystem.config.cjs`), corre con el intérprete de Bun.
- **nginx** sirve el `dist/` del frontend y proxea `/api/` al backend Bun (sin rewrite — el prefijo `/api` es parte de las rutas del backend, lo que mantiene el type-safety de Eden).
- HTTPS vía **Let's Encrypt / certbot**.

## Estructura

```
core/
├── backend/          # Bun + Elysia + Drizzle
│   ├── src/
│   │   ├── db/        # schema, conexión y migraciones Drizzle
│   │   ├── auth.ts    # Argon2id + anti fuerza bruta
│   │   ├── config.ts
│   │   ├── index.ts   # servidor Elysia (montado en /api)
│   │   └── seed.ts
│   └── drizzle/       # migraciones SQL versionadas
└── frontend/         # React 19 + Vite + SCSS
    └── src/
        ├── eden.ts    # cliente Eden Treaty (type-safe)
        └── components/
```

## Licencia

MIT — ver [LICENSE](./LICENSE).
