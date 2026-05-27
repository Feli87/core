/**
 * Seed de usuario inicial. Uso:
 *   USERNAME=admin PASSWORD=*** bun run src/seed.ts
 */
import { createUser, findUser } from "./auth";

const username = process.env.USERNAME ?? "admin";
const password = process.env.PASSWORD;

if (!password || password.length < 12) {
  console.error("❌ Definí PASSWORD (min 12 chars).");
  process.exit(1);
}

const existing = await findUser(username);
if (existing) {
  console.log(`ℹ️  El usuario '${username}' ya existe.`);
  process.exit(0);
}

await createUser(username, password, "admin");
console.log(`✅ Usuario '${username}' creado con rol admin.`);
