/**
 * Drizzle schema — fuente única de verdad de la estructura de datos.
 * Tipado estático compartido por todo el backend.
 */
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passHash: text("pass_hash").notNull(),
  role: text("role").notNull().default("operator"),
  failed: integer("failed").notNull().default(0),
  lockedUntil: integer("locked_until").notNull().default(0),
  createdAt: integer("created_at").notNull().default(0),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username"),
  event: text("event").notNull(),
  ip: text("ip"),
  at: integer("at").notNull().default(0),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
