/**
 * Cliente Eden Treaty — type-safe end-to-end.
 * Importa SOLO el tipo `App` del backend (type-only, sin runtime cruzado).
 * El backend monta sus rutas bajo /api, igual que la URL pública, así
 * `client.api.auth.login.post(...)` mapea exactamente a /api/auth/login.
 */
import { treaty } from "@elysiajs/eden";
import type { App } from "../../backend/src/index";

const origin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:3005";

export const app = treaty<App>(origin, {
  fetcher: (url, init) => fetch(url, { ...init, credentials: "include" }),
});

// Sub-cliente con el prefijo /api ya resuelto.
export const api = app.api;
