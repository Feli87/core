/**
 * Service del módulo remote-config — lógica de negocio.
 * Orquesta el repository, agrega timestamps y normaliza resultados.
 */
import { remoteConfigRepository } from "./remoteConfig.repository";
import type { CreateBody, UpdateBody } from "./remoteConfig.model";
import type { RemoteConfigRow } from "./remoteConfig.schema";

const now = () => Math.floor(Date.now() / 1000);

export const remoteConfigService = {
  list(userId: number): RemoteConfigRow[] {
    return remoteConfigRepository.listByUser(userId);
  },

  get(userId: number, id: number): RemoteConfigRow | undefined {
    return remoteConfigRepository.findOwned(userId, id);
  },

  create(userId: number, data: CreateBody): RemoteConfigRow {
    const ts = now();
    return remoteConfigRepository.insert({
      userId,
      ...data,
      createdAt: ts,
      updatedAt: ts,
    });
  },

  update(userId: number, id: number, patch: UpdateBody): RemoteConfigRow | undefined {
    // Sin campos a actualizar → devolvemos el actual.
    if (Object.keys(patch).length === 0) {
      return remoteConfigRepository.findOwned(userId, id);
    }
    return remoteConfigRepository.update(userId, id, { ...patch, updatedAt: now() });
  },

  remove(userId: number, id: number): boolean {
    return remoteConfigRepository.remove(userId, id);
  },
};
