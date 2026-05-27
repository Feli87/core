/**
 * Controller del módulo auth — capa HTTP (rutas Elysia).
 * Traduce request↔response y delega TODA la lógica en authService.
 */
import { Elysia } from "elysia";
import { authPlugin, COOKIE } from "../../shared/auth.plugin";
import { rateLimit, clientIp } from "../../shared/security";
import { config } from "../../config";
import { authService } from "./auth.service";
import { loginBody } from "./auth.model";

export const authController = new Elysia({ prefix: "/auth", tags: ["auth"] })
  .use(authPlugin)

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
