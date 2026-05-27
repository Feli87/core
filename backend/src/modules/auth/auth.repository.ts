/**
 * Repository del módulo auth — única capa que toca la DB de users/audit.
 * No contiene lógica de negocio: solo lecturas y escrituras.
 */
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users, auditLog, type UserRow, type NewUser } from "./auth.schema";

export const authRepository = {
  findByUsername(username: string): UserRow | undefined {
    return db.select().from(users).where(eq(users.username, username)).get();
  },

  insert(user: NewUser) {
    return db.insert(users).values(user).run();
  },

  updateLockState(id: number, failed: number, lockedUntil: number) {
    return db.update(users).set({ failed, lockedUntil }).where(eq(users.id, id)).run();
  },

  resetLockState(id: number) {
    return db.update(users).set({ failed: 0, lockedUntil: 0 }).where(eq(users.id, id)).run();
  },

  audit(username: string | null, event: string, ip: string) {
    return db
      .insert(auditLog)
      .values({ username, event, ip, at: Math.floor(Date.now() / 1000) })
      .run();
  },
};
