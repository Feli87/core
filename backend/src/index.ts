/**
 * core — backend Bun premium, arquitectura modular por feature.
 *
 * Composición: cada módulo expone su controller (rutas Elysia). Acá solo
 * se montan bajo /api junto con los plugins compartidos (security + swagger).
 * La lógica vive en cada modules/<feature>/{controller,service,repository}.
 */
import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { config } from "./config";
import { securityHeaders } from "./shared/security";
import { authPlugin } from "./shared/auth.plugin";
import { authController } from "./modules/auth";
import { remoteConfigController } from "./modules/remote-config";

const app = new Elysia({ prefix: "/api" })
  .use(securityHeaders)
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: "Core API",
          version: "1.1.0",
          description: "Núcleo seguro de AZONLINE — Bun + Elysia + Drizzle (modular)",
        },
        tags: [
          { name: "auth", description: "Autenticación y sesión" },
          { name: "remote-config", description: "Configuraciones remotas por usuario" },
          { name: "secure", description: "Recursos protegidos" },
        ],
      },
    })
  )

  // ---- Health (público) ----
  .get("/health", () => ({ status: "ok", service: "core" }), {
    detail: { tags: ["auth"], summary: "Health check" },
  })

  // ---- Módulos ----
  .use(authController)
  .use(remoteConfigController)

  // ---- Recurso protegido de ejemplo ----
  .use(authPlugin)
  .get(
    "/secure/dashboard",
    ({ user }) => ({
      message: `Bienvenido al núcleo, ${user.username}`,
      role: user.role,
      node: "core",
      stack: ["Bun", "Elysia", "Drizzle ORM", "JWT", "Swagger", "Eden Treaty"],
      timestamp: new Date().toISOString(),
    }),
    { requireAuth: true, detail: { tags: ["secure"], summary: "Dashboard protegido" } }
  )

  .listen({ port: config.port, hostname: config.host });

console.log(
  `🔐 core backend en http://${config.host}:${config.port} · docs en /api/docs (${config.isProd ? "prod" : "dev"})`
);

export type App = typeof app;
