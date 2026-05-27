/**
 * Schema Drizzle del módulo remote-config.
 * - remote_configs: estado ACTUAL de cada config (pertenece a un usuario).
 * - remote_config_versions: snapshot INMUTABLE por cada cambio (historial).
 *   Nunca se modifica ni se borra una versión: el restore crea una versión nueva
 *   con el contenido de una vieja (historial append-only, auditable).
 */
import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { users } from "../auth/auth.schema";

export const remoteConfigs = sqliteTable(
  "remote_configs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    title: text("title"),
    description: text("description"),
    url: text("url"),
    image: text("image"),
    bgColor: text("bg_color"),
    textColor: text("text_color"),
    version: integer("version").notNull().default(1),
    createdAt: integer("created_at").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
  },
  (table) => [index("idx_remote_configs_user").on(table.userId)]
);

export const remoteConfigVersions = sqliteTable(
  "remote_config_versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    configId: integer("config_id")
      .notNull()
      .references(() => remoteConfigs.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    // snapshot de los campos de contenido en ese momento
    name: text("name").notNull(),
    title: text("title"),
    description: text("description"),
    url: text("url"),
    image: text("image"),
    bgColor: text("bg_color"),
    textColor: text("text_color"),
    // metadatos de auditoría
    changeNote: text("change_note"),
    createdBy: text("created_by"),
    createdAt: integer("created_at").notNull().default(0),
  },
  (table) => [index("idx_rc_versions_config").on(table.configId)]
);

export type RemoteConfigRow = typeof remoteConfigs.$inferSelect;
export type NewRemoteConfig = typeof remoteConfigs.$inferInsert;
export type RemoteConfigVersionRow = typeof remoteConfigVersions.$inferSelect;
export type NewRemoteConfigVersion = typeof remoteConfigVersions.$inferInsert;
