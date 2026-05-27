/**
 * Utilidades de seguridad compartidas: headers estrictos + rate-limit in-memory.
 */
import { Elysia } from "elysia";

// ---- Headers de seguridad en toda respuesta ----
export const securityHeaders = new Elysia({ name: "security-headers" }).onAfterHandle(
  ({ set }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "DENY";
    set.headers["Referrer-Policy"] = "no-referrer";
    set.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
    set.headers["Cache-Control"] = "no-store";
  }
);

// ---- Rate limiter (sliding window por IP) ----
const hits = new Map<string, number[]>();

export function rateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length <= max;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of hits) {
    const fresh = arr.filter((t) => now - t < 60_000);
    if (fresh.length) hits.set(ip, fresh);
    else hits.delete(ip);
  }
}, 60_000);

/** Extrae la IP real respetando el X-Forwarded-For de nginx. */
export function clientIp(request: Request, server: { requestIP?: (r: Request) => { address: string } | null } | null): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    server?.requestIP?.(request)?.address ??
    "unknown"
  );
}
