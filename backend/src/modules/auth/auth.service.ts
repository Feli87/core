/**
 * Service del módulo auth — lógica de negocio:
 * hashing Argon2id, verificación con defensa de timing y anti fuerza bruta.
 * No sabe nada de HTTP ni de SQL crudo (delega en el repository).
 */
import { config } from "../../config";
import { authRepository } from "./auth.repository";
import type { PublicUser } from "./auth.model";

const HASH_OPTS = { algorithm: "argon2id", memoryCost: 19456, timeCost: 2 } as const;
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$Y29yZWF6b25saW5lZHVtbXlzYWx0$ZHVtbXloYXNodmFsdWVnb2VzaGVyZXBhZA";

export type LoginResult =
  | { ok: true; user: PublicUser }
  | { ok: false; reason: "invalid" | "locked" };

export const authService = {
  async hash(plain: string): Promise<string> {
    return Bun.password.hash(plain, HASH_OPTS);
  },

  async createUser(username: string, plain: string, role = "operator") {
    const passHash = await this.hash(plain);
    authRepository.insert({
      username,
      passHash,
      role,
      createdAt: Math.floor(Date.now() / 1000),
    });
  },

  userExists(username: string): boolean {
    return !!authRepository.findByUsername(username);
  },

  async verifyLogin(username: string, plain: string): Promise<LoginResult> {
    const user = authRepository.findByUsername(username);
    const now = Date.now();

    // Defensa de timing: si no existe, igual gastamos un verify.
    if (!user) {
      await Bun.password.verify(plain, DUMMY_HASH).catch(() => false);
      return { ok: false, reason: "invalid" };
    }

    if (user.lockedUntil > now) return { ok: false, reason: "locked" };

    const valid = await Bun.password.verify(plain, user.passHash).catch(() => false);
    if (!valid) {
      const failed = user.failed + 1;
      const lockedUntil = failed >= config.maxFailedAttempts ? now + config.lockoutMs : 0;
      authRepository.updateLockState(user.id, failed, lockedUntil);
      return { ok: false, reason: lockedUntil ? "locked" : "invalid" };
    }

    authRepository.resetLockState(user.id);
    return { ok: true, user: { id: user.id, username: user.username, role: user.role } };
  },

  audit(username: string | null, event: string, ip: string) {
    authRepository.audit(username, event, ip);
  },
};
