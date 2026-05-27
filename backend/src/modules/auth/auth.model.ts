/**
 * DTOs del módulo auth — validación de entrada/salida con typebox de Elysia.
 * `t` genera validación en runtime Y tipos estáticos a la vez.
 */
import { t } from "elysia";

export const loginBody = t.Object({
  username: t.String({ minLength: 3, maxLength: 64 }),
  password: t.String({ minLength: 8, maxLength: 200 }),
});

// signup: el username será el subdominio público → estrictamente url-safe.
export const signupBody = t.Object({
  username: t.String({ pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", minLength: 3, maxLength: 40 }),
  password: t.String({ minLength: 8, maxLength: 200 }),
});

export const publicUser = t.Object({
  id: t.Number(),
  username: t.String(),
  role: t.String(),
});

export type LoginBody = typeof loginBody.static;
export type PublicUser = typeof publicUser.static;
