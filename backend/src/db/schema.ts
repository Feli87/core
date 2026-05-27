/**
 * Barrel central de schemas. Drizzle (migraciones + cliente) necesita ver
 * TODAS las tablas. Cada módulo define su schema; acá los re-exportamos.
 */
export * from "../modules/auth/auth.schema";
export * from "../modules/remote-config/remoteConfig.schema";
export * from "../modules/blog/blog.schema";
