/**
 * Controller del módulo remote-config — CRUD HTTP.
 * Todas las rutas exigen sesión (requireAuth) y operan SOLO sobre las configs
 * del usuario autenticado (user.id viene del guard, no del cliente).
 */
import { Elysia, t } from "elysia";
import { authPlugin } from "../../shared/auth.plugin";
import { remoteConfigService } from "./remoteConfig.service";
import { createBody, updateBody } from "./remoteConfig.model";

export const remoteConfigController = new Elysia({
  prefix: "/remote-configs",
  tags: ["remote-config"],
})
  .use(authPlugin)
  .guard({ requireAuth: true })

  .get("/", ({ user }) => ({ data: remoteConfigService.list(user.id) }), {
    detail: { summary: "Listar mis remote configs" },
  })

  .get(
    "/:id",
    ({ user, params, status }) => {
      const rc = remoteConfigService.get(user.id, params.id);
      return rc ? { data: rc } : status(404, { error: "No encontrada" });
    },
    { params: t.Object({ id: t.Number() }), detail: { summary: "Obtener una remote config" } }
  )

  .post(
    "/",
    ({ user, body, status }) => {
      const rc = remoteConfigService.create(user.id, body);
      return status(201, { data: rc });
    },
    { body: createBody, detail: { summary: "Crear remote config" } }
  )

  .patch(
    "/:id",
    ({ user, params, body, status }) => {
      const rc = remoteConfigService.update(user.id, params.id, body);
      return rc ? { data: rc } : status(404, { error: "No encontrada" });
    },
    {
      params: t.Object({ id: t.Number() }),
      body: updateBody,
      detail: { summary: "Actualizar remote config" },
    }
  )

  .delete(
    "/:id",
    ({ user, params, status }) => {
      const ok = remoteConfigService.remove(user.id, params.id);
      return ok ? { ok: true } : status(404, { error: "No encontrada" });
    },
    { params: t.Object({ id: t.Number() }), detail: { summary: "Eliminar remote config" } }
  );
