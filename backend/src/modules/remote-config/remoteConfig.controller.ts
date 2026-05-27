/**
 * Controller del módulo remote-config — CRUD + versionado.
 * Todas las rutas exigen sesión y operan sobre las configs del usuario
 * autenticado (user.id del guard). El service publica al hub en tiempo real.
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
      const rc = remoteConfigService.create(user.id, user.username, body);
      return status(201, { data: rc });
    },
    { body: createBody, detail: { summary: "Crear remote config" } }
  )

  .patch(
    "/:id",
    ({ user, params, body, status }) => {
      const rc = remoteConfigService.update(user.id, user.username, params.id, body);
      return rc ? { data: rc } : status(404, { error: "No encontrada" });
    },
    {
      params: t.Object({ id: t.Number() }),
      body: updateBody,
      detail: { summary: "Actualizar remote config (crea nueva versión)" },
    }
  )

  .delete(
    "/:id",
    ({ user, params, status }) => {
      const ok = remoteConfigService.remove(user.id, params.id);
      return ok ? { ok: true } : status(404, { error: "No encontrada" });
    },
    { params: t.Object({ id: t.Number() }), detail: { summary: "Eliminar remote config" } }
  )

  // ---- Versionado ----
  .get(
    "/:id/versions",
    ({ user, params, status }) => {
      const versions = remoteConfigService.listVersions(user.id, params.id);
      return versions ? { data: versions } : status(404, { error: "No encontrada" });
    },
    { params: t.Object({ id: t.Number() }), detail: { summary: "Historial de versiones" } }
  )

  .post(
    "/:id/restore/:version",
    ({ user, params, status }) => {
      const rc = remoteConfigService.restore(
        user.id,
        user.username,
        params.id,
        params.version
      );
      return rc ? { data: rc } : status(404, { error: "Config o versión no encontrada" });
    },
    {
      params: t.Object({ id: t.Number(), version: t.Number() }),
      detail: { summary: "Restaurar una versión (crea una nueva versión)" },
    }
  );
