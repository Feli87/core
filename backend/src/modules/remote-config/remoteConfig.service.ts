/**
 * Service del módulo remote-config — lógica de negocio.
 * Orquesta el repository (con versionado) y publica eventos al hub de tiempo
 * real tras cada mutación, para que los clientes suscritos se actualicen.
 */
import { remoteConfigRepository } from "./remoteConfig.repository";
import { hub } from "../../shared/hub";
import type { CreateBody, UpdateBody } from "./remoteConfig.model";
import type { RemoteConfigRow, RemoteConfigVersionRow } from "./remoteConfig.schema";

export const remoteConfigService = {
  list(userId: number): RemoteConfigRow[] {
    return remoteConfigRepository.listByUser(userId);
  },

  get(userId: number, id: number): RemoteConfigRow | undefined {
    return remoteConfigRepository.findOwned(userId, id);
  },

  create(userId: number, by: string, data: CreateBody): RemoteConfigRow {
    const now = Math.floor(Date.now() / 1000);
    const row = remoteConfigRepository.create(
      { userId, ...data, version: 1, createdAt: now, updatedAt: now },
      { changeNote: "created", createdBy: by }
    );
    hub.publish(userId, { type: "config.created", configId: row.id, data: row, version: row.version });
    return row;
  },

  update(
    userId: number,
    by: string,
    id: number,
    patch: UpdateBody & { changeNote?: string }
  ): RemoteConfigRow | undefined {
    const { changeNote, ...content } = patch;
    if (Object.keys(content).length === 0) {
      return remoteConfigRepository.findOwned(userId, id);
    }
    const row = remoteConfigRepository.applyChange(userId, id, content, {
      changeNote,
      createdBy: by,
    });
    if (row) {
      hub.publish(userId, { type: "config.updated", configId: row.id, data: row, version: row.version });
    }
    return row;
  },

  listVersions(userId: number, id: number): RemoteConfigVersionRow[] | undefined {
    return remoteConfigRepository.listVersions(userId, id);
  },

  /**
   * Restaura una versión anterior creando una versión NUEVA con ese contenido
   * (no destructivo: el historial nunca se reescribe ni pierde).
   */
  restore(
    userId: number,
    by: string,
    id: number,
    version: number
  ): RemoteConfigRow | undefined {
    const snap = remoteConfigRepository.getVersion(userId, id, version);
    if (!snap) return undefined;
    const row = remoteConfigRepository.applyChange(
      userId,
      id,
      {
        name: snap.name,
        title: snap.title,
        description: snap.description,
        url: snap.url,
        image: snap.image,
        bgColor: snap.bgColor,
        textColor: snap.textColor,
      },
      { changeNote: `restored from v${version}`, createdBy: by }
    );
    if (row) {
      hub.publish(userId, { type: "config.restored", configId: row.id, data: row, version: row.version });
    }
    return row;
  },

  remove(userId: number, id: number): boolean {
    const ok = remoteConfigRepository.remove(userId, id);
    if (ok) {
      hub.publish(userId, { type: "config.deleted", configId: id, data: { id } });
    }
    return ok;
  },
};
