/**
 * Controller de tiempo real (WebSocket).
 * Autentica por la cookie JWT (mismo mecanismo que el resto), suscribe la
 * conexión al canal del usuario y le reenvía los eventos del hub.
 *
 * Ruta: /api/realtime  (ws:// o wss:// según el esquema)
 */
import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { config } from "../../config";
import { COOKIE } from "../../shared/auth.plugin";
import { hub, type RealtimeEvent } from "../../shared/hub";

export const realtimeController = new Elysia({ tags: ["realtime"] })
  .use(jwt({ name: "jwt", secret: config.jwtSecret, exp: "7d" }))
  .ws("/realtime", {
    async open(ws) {
      // autenticación: leer la cookie del handshake y verificar el JWT
      const raw = ws.data.cookie[COOKIE]?.value;
      const token = typeof raw === "string" ? raw : "";
      const payload = token ? await ws.data.jwt.verify(token) : false;

      if (!payload) {
        ws.send({ type: "error", message: "No autenticado" });
        ws.close();
        return;
      }

      const userId = Number(payload.sub);
      // suscribir esta conexión al canal del usuario
      const unsubscribe = hub.subscribe(userId, (event: RealtimeEvent) => {
        ws.send(event);
      });

      // guardamos el unsubscribe en la conexión para el close
      (ws.data as { unsubscribe?: () => void }).unsubscribe = unsubscribe;
      ws.send({ type: "ready", userId, at: Date.now() });
    },

    message(ws, message) {
      // ping/pong simple para keep-alive
      if (message === "ping" || (typeof message === "object" && message && (message as { type?: string }).type === "ping")) {
        ws.send({ type: "pong", at: Date.now() });
      }
    },

    close(ws) {
      const unsub = (ws.data as { unsubscribe?: () => void }).unsubscribe;
      if (unsub) unsub();
    },
  });
