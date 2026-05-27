/**
 * Schema Drizzle del módulo remote-config — tabla remote_configs.
 * Cada config pertenece a un usuario (userId → users.id). Un usuario puede
 * tener 0..N configs.
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
    createdAt: integer("created_at").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
  },
  (table) => [index("idx_remote_configs_user").on(table.userId)]
);

export type RemoteConfigRow = typeof remoteConfigs.$inferSelect;
export type NewRemoteConfig = typeof remoteConfigs.$inferInsert;
