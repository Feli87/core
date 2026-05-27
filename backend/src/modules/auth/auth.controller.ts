/**
 * Controller del módulo auth — capa HTTP (rutas Elysia).
 * Traduce request↔response y delega TODA la lógica en authService.
 */
import { Elysia } from "elysia";
import { authPlugin, COOKIE } from "../../shared/auth.plugin";
import { rateLimit, clientIp } from "../../shared/security";
import { config } from "../../config";
import { authService } from "./auth.service";
import { blogService } from "../blog/blog.service";
import { loginBody, signupBody } from "./auth.model";

// Subdominios ya en uso / reservados — no se pueden registrar como username.
const RESERVED = new Set([
  "www", "api", "admin", "root", "core", "core-ingress", "mail", "webmail",
  "back", "dev", "dev-backend", "mcp", "opendata", "rss", "mapa", "umd-map",
  "umd-map-dev", "landing-demo", "ftp", "ns", "ns1", "ns2", "smtp", "blog",
  "app", "dashboard", "static", "assets", "cdn", "status", "support",
]);

export const authController = new Elysia({ prefix: "/auth", tags: ["auth"] })
  .use(authPlugin)

  .post(
    "/signup",
    async ({ body, jwt, cookie, status, server, request }) => {
      const ip = clientIp(request, server);
      if (!rateLimit(`signup:${ip}`, 5, 60_000)) {
        return status(429, { error: "Demasiados registros. Esperá un momento." });
      }
      if (RESERVED.has(body.username)) {
        return status(409, { error: "Ese nombre está reservado. Probá otro." });
      }

      const user = await authService.register(body.username, body.password);
      if (!user) {
        return status(409, { error: "Ese nombre de usuario ya existe." });
      }

      // provisión del blog (branding remote-config + blog + post de bienvenida)
      const provisioned = blogService.provisionFor(user.id, user.username);
      authService.audit(user.username, "signup_ok", ip);

      // auto-login: misma cookie httpOnly que el login normal
      const token = await jwt.sign({
        sub: String(user.id),
        username: user.username,
        role: user.role,
      });
      cookie[COOKIE].set({
        value: token,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: config.sessionTtl,
      });

      return status(201, {
        user,
        blog: {
          slug: provisioned.blog.slug,
          title: provisioned.blog.title,
          url: `https://${provisioned.blog.slug}.azonline.com.ar`,
        },
      });
    },
    { body: signupBody, detail: { summary: "Registrarse (provisiona blog + subdominio)" } }
  )

  .post(
    "/login",
    async ({ body, jwt, cookie, status, server, request }) => {
      const ip = clientIp(request, server);

      if (!rateLimit(ip, 10, 60_000)) {
        return status(429, { error: "Demasiados intentos. Esperá un momento." });
      }

      const result = await authService.verifyLogin(body.username, body.password);
      if (!result.ok) {
        authService.audit(body.username, `login_fail:${result.reason}`, ip);
        return result.reason === "locked"
          ? status(423, { error: "Cuenta bloqueada temporalmente por seguridad." })
          : status(401, { error: "Credenciales inválidas." });
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
      authService.audit(body.username, "login_ok", ip);
      return { user: result.user };
    },
    { body: loginBody, detail: { summary: "Iniciar sesión" } }
  )

  .get("/me", ({ user }) => ({ user }), {
    requireAuth: true,
    detail: { summary: "Sesión actual" },
  })

  .post(
    "/logout",
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
    { detail: { summary: "Cerrar sesión" } }
  );
