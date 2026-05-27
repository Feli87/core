function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length < 16) throw new Error(`ENV ${name} faltante o corta (min 16)`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 3005),
  host: "127.0.0.1",
  jwtSecret: required("JWT_SECRET"),
  origin: process.env.ORIGIN ?? "https://core.azonline.com.ar",
  isProd: process.env.NODE_ENV === "production",
  sessionTtl: 60 * 60 * 24 * 7,
  maxFailedAttempts: 5,
  lockoutMs: 15 * 60 * 1000,
} as const;
