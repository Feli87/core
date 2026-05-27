/**
 * Repository del módulo remote-config — única capa que toca la DB.
 * TODAS las operaciones se scopean por userId (aislamiento de datos).
 * El versionado es append-only: cada mutación inserta un snapshot inmutable
 * en remote_config_versions.
 */
import { and, eq, desc } from "drizzle-orm";
import { db } from "../../db";
import {
  remoteConfigs,
  remoteConfigVersions,
  type RemoteConfigRow,
  type NewRemoteConfig,
  type RemoteConfigVersionRow,
} from "./remoteConfig.schema";

// campos de contenido que se versionan
type Content = Pick<
  NewRemoteConfig,
  "name" | "title" | "description" | "url" | "image" | "bgColor" | "textColor"
>;

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

  /** Crea la config (version 1) + su primer snapshot, atómico. */
  create(
    data: NewRemoteConfig,
    meta: { changeNote?: string; createdBy?: string }
  ): RemoteConfigRow {
    return db.transaction((tx) => {
      const row = tx.insert(remoteConfigs).values(data).returning().get();
      // snapshot v1 (usa la misma tx via el helper directo)
      tx.insert(remoteConfigVersions)
        .values({
          configId: row.id,
          version: row.version,
          name: row.name,
          title: row.title,
          description: row.description,
          url: row.url,
          image: row.image,
          bgColor: row.bgColor,
          textColor: row.textColor,
          changeNote: meta.changeNote ?? "created",
          createdBy: meta.createdBy,
          createdAt: row.createdAt,
        })
        .run();
      return row;
    });
  },

  /** Aplica un patch de contenido, incrementa version y snapshotea. Atómico. */
  applyChange(
    userId: number,
    id: number,
    patch: Partial<Content>,
    meta: { changeNote?: string; createdBy?: string }
  ): RemoteConfigRow | undefined {
    return db.transaction((tx) => {
      const current = tx
        .select()
        .from(remoteConfigs)
        .where(and(eq(remoteConfigs.id, id), eq(remoteConfigs.userId, userId)))
        .get();
      if (!current) return undefined;

      const nextVersion = current.version + 1;
      const now = Math.floor(Date.now() / 1000);
      const updated = tx
        .update(remoteConfigs)
        .set({ ...patch, version: nextVersion, updatedAt: now })
        .where(and(eq(remoteConfigs.id, id), eq(remoteConfigs.userId, userId)))
        .returning()
        .get();

      tx.insert(remoteConfigVersions)
        .values({
          configId: updated.id,
          version: updated.version,
          name: updated.name,
          title: updated.title,
          description: updated.description,
          url: updated.url,
          image: updated.image,
          bgColor: updated.bgColor,
          textColor: updated.textColor,
          changeNote: meta.changeNote,
          createdBy: meta.createdBy,
          createdAt: now,
        })
        .run();
      return updated;
    });
  },

  listVersions(userId: number, id: number): RemoteConfigVersionRow[] | undefined {
    const owned = this.findOwned(userId, id);
    if (!owned) return undefined;
    return db
      .select()
      .from(remoteConfigVersions)
      .where(eq(remoteConfigVersions.configId, id))
      .orderBy(desc(remoteConfigVersions.version))
      .all();
  },

  getVersion(
    userId: number,
    id: number,
    version: number
  ): RemoteConfigVersionRow | undefined {
    const owned = this.findOwned(userId, id);
    if (!owned) return undefined;
    return db
      .select()
      .from(remoteConfigVersions)
      .where(
        and(
          eq(remoteConfigVersions.configId, id),
          eq(remoteConfigVersions.version, version)
        )
      )
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
