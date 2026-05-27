/**
 * Repository del módulo remote-config — única capa que toca la DB.
 * TODAS las operaciones se scopean por userId: un usuario nunca puede leer
 * ni tocar las configs de otro (aislamiento a nivel de datos).
 */
import { and, eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { remoteConfigs, type RemoteConfigRow, type NewRemoteConfig } from "./remoteConfig.schema";

export const remoteConfigRepository = {
  listByUser(userId: number): RemoteConfigRow[] {
    return db
      .select()
      .from(remoteConfigs)
      .where(eq(remoteConfigs.userId, userId))
      .orderBy(desc(remoteConfigs.createdAt))
      .all();
  },

  findOwned(userId: number, id: number): RemoteConfigRow | undefined {
    return db
      .select()
      .from(remoteConfigs)
      .where(and(eq(remoteConfigs.id, id), eq(remoteConfigs.userId, userId)))
      .get();
  },

  insert(data: NewRemoteConfig): RemoteConfigRow {
    return db.insert(remoteConfigs).values(data).returning().get();
  },

  update(userId: number, id: number, patch: Partial<NewRemoteConfig>): RemoteConfigRow | undefined {
    return db
      .update(remoteConfigs)
      .set(patch)
      .where(and(eq(remoteConfigs.id, id), eq(remoteConfigs.userId, userId)))
      .returning()
      .get();
  },

  remove(userId: number, id: number): boolean {
    const deleted = db
      .delete(remoteConfigs)
      .where(and(eq(remoteConfigs.id, id), eq(remoteConfigs.userId, userId)))
      .returning()
      .all();
    return deleted.length > 0;
  },
};
