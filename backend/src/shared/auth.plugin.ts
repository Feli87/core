/**
 * Plugin de autenticación reutilizable.
 * Expone el macro `requireAuth`: cualquier ruta que lo active recibe `user`
 * resuelto (type-safe) y responde 401 si la cookie/JWT no es válida.
 *
 * Uso en un controller:
 *   .get("/me", ({ user }) => user, { requireAuth: true })
 */
import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { config } from "../config";

export const COOKIE = "core_session";

export interface SessionUser {
  id: number;
  username: string;
  role: string;
}

export const authPlugin = new Elysia({ name: "auth-plugin" })
  .use(jwt({ name: "jwt", secret: config.jwtSecret, exp: "7d" }))
  .macro({
    requireAuth: {
      async resolve({ jwt, cookie, status }) {
        const raw = cookie[COOKIE]?.value;
        const token = typeof raw === "string" ? raw : "";
        const payload = token ? await jwt.verify(token) : false;
        if (!payload) return status(401, { error: "No autenticado" });
        return {
          user: {
            id: Number(payload.sub),
            username: payload.username as string,
            role: payload.role as string,
          } satisfies SessionUser,
        };
      },
    },
  });
