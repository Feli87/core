/**
 * Lógica de auth con Drizzle ORM. Argon2id (Bun nativo) + anti fuerza bruta
 * + defensa de timing.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { config } from "./config";

const HASH_OPTS = { algorithm: "argon2id", memoryCost: 19456, timeCost: 2 } as const;
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$Y29yZWF6b25saW5lZHVtbXlzYWx0$ZHVtbXloYXNodmFsdWVnb2VzaGVyZXBhZA";

export async function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain, HASH_OPTS);
}

export async function createUser(username: string, plain: string, role = "operator") {
  const passHash = await hashPassword(plain);
  await db
    .insert(schema.users)
    .values({ username, passHash, role, createdAt: Math.floor(Date.now() / 1000) });
}

export async function findUser(username: string) {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);
  return rows[0] ?? null;
}

export type LoginResult =
  | { ok: true; user: { id: number; username: string; role: string } }
  | { ok: false; reason: "invalid" | "locked" };

export async function verifyLogin(username: string, plain: string): Promise<LoginResult> {
  const user = await findUser(username);
  const now = Date.now();

  if (!user) {
    await Bun.password.verify(plain, DUMMY_HASH).catch(() => false);
    return { ok: false, reason: "invalid" };
  }
  if (user.lockedUntil > now) return { ok: false, reason: "locked" };

  const valid = await Bun.password.verify(plain, user.passHash).catch(() => false);
  if (!valid) {
    const failed = user.failed + 1;
    const lockedUntil = failed >= config.maxFailedAttempts ? now + config.lockoutMs : 0;
    await db
      .update(schema.users)
      .set({ failed, lockedUntil })
      .where(eq(schema.users.id, user.id));
    return { ok: false, reason: lockedUntil ? "locked" : "invalid" };
  }

  await db
    .update(schema.users)
    .set({ failed: 0, lockedUntil: 0 })
    .where(eq(schema.users.id, user.id));
  return { ok: true, user: { id: user.id, username: user.username, role: user.role } };
}

export async function audit(username: string | null, event: string, ip: string) {
  await db
    .insert(schema.auditLog)
    .values({ username, event, ip, at: Math.floor(Date.now() / 1000) });
}
