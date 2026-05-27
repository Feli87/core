/**
 * core — backend Bun premium.
 * Stack: Elysia + Drizzle ORM (bun:sqlite) + JWT + Swagger + Eden Treaty.
 *
 * Type-safety end-to-end: el tipo `App` se exporta y el frontend lo consume
 * con Eden Treaty, asì el cliente conoce rutas, params y respuestas sin DTOs.
 */
import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { swagger } from "@elysiajs/swagger";
import { config } from "./config";
import { verifyLogin, audit } from "./auth";

// ---- Rate limiter in-memory (sliding window por IP) ----
const hits = new Map<string, number[]>();
function rateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length <= max;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of hits) {
    const fresh = arr.filter((t) => now - t < 60_000);
    if (fresh.length) hits.set(ip, fresh);
    else hits.delete(ip);
  }
}, 60_000);

const COOKIE = "core_session";

// Prefijo /api: coincide con la URL pública (nginx no reescribe), lo que
// permite que Eden Treaty mapee tipos 1:1 sin desajustes de ruta.
const app = new Elysia({ prefix: "/api" })
  .onAfterHandle(({ set }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "DENY";
    set.headers["Referrer-Policy"] = "no-referrer";
    set.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
    set.headers["Cache-Control"] = "no-store";
  })
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: { title: "Core API", version: "1.0.0", description: "Núcleo seguro de AZONLINE — Bun + Elysia + Drizzle" },
        tags: [
          { name: "auth", description: "Autenticación y sesión" },
          { name: "secure", description: "Recursos protegidos" },
        ],
      },
    })
  )
  .use(jwt({ name: "jwt", secret: config.jwtSecret, exp: "7d" }))

  .get("/health", () => ({ status: "ok", service: "core" }), {
    detail: { tags: ["auth"], summary: "Health check" },
  })

  .post(
    "/auth/login",
    async ({ body, jwt, cookie, set, server, request }) => {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        server?.requestIP(request)?.address ??
        "unknown";

      if (!rateLimit(ip, 10, 60_000)) {
        set.status = 429;
        return { error: "Demasiados intentos. Esperá un momento." };
      }

      const result = await verifyLogin(body.username, body.password);
      if (!result.ok) {
        await audit(body.username, `login_fail:${result.reason}`, ip);
        set.status = result.reason === "locked" ? 423 : 401;
        return {
          error:
            result.reason === "locked"
              ? "Cuenta bloqueada temporalmente por seguridad."
              : "Credenciales inválidas.",
        };
      }

      const token = await jwt.sign({
        sub: String(result.user.id),
        username: result.user.username,
        role: result.user.role,
      });
      cookie[COOKIE].set({
        value: token,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: config.sessionTtl,
      });
      await audit(body.username, "login_ok", ip);
      return { user: result.user };
    },
    {
      body: t.Object({
        username: t.String({ minLength: 3, maxLength: 64 }),
        password: t.String({ minLength: 8, maxLength: 200 }),
      }),
      detail: { tags: ["auth"], summary: "Iniciar sesión" },
    }
  )

  .get(
    "/auth/me",
    async ({ jwt, cookie, set }) => {
      const payload = await jwt.verify(cookie[COOKIE].value);
      if (!payload) {
        set.status = 401;
        return { error: "No autenticado" };
      }
      return { user: { username: payload.username as string, role: payload.role as string } };
    },
    { detail: { tags: ["auth"], summary: "Sesión actual" } }
  )

  .post(
    "/auth/logout",
    ({ cookie }) => {
      cookie[COOKIE].set({
        value: "",
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 0,
      });
      return { ok: true };
    },
    { detail: { tags: ["auth"], summary: "Cerrar sesión" } }
  )

  .get(
    "/secure/dashboard",
    async ({ jwt, cookie, set }) => {
      const payload = await jwt.verify(cookie[COOKIE].value);
      if (!payload) {
        set.status = 401;
        return { error: "No autenticado" };
      }
      return {
        message: `Bienvenido al núcleo, ${payload.username}`,
        role: payload.role as string,
        node: "core",
        stack: ["Bun", "Elysia", "Drizzle ORM", "JWT", "Swagger", "Eden Treaty"],
        timestamp: new Date().toISOString(),
      };
    },
    { detail: { tags: ["secure"], summary: "Dashboard protegido" } }
  )

  .listen({ port: config.port, hostname: config.host });

console.log(
  `🔐 core backend en http://${config.host}:${config.port} · docs en /docs (${config.isProd ? "prod" : "dev"})`
);

export type App = typeof app;
