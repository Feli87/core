/**
 * DTOs del módulo remote-config.
 * - createBody: campos al crear (name obligatorio, resto opcional)
 * - updateBody: todos opcionales (PATCH parcial)
 * - colores validados con patrón hex (#rgb / #rrggbb)
 */
import { t } from "elysia";

const hex = t.String({ pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" });
const url = t.String({ format: "uri", maxLength: 2048 });

export const createBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  title: t.Optional(t.String({ maxLength: 200 })),
  description: t.Optional(t.String({ maxLength: 2000 })),
  url: t.Optional(url),
  image: t.Optional(url),
  bgColor: t.Optional(hex),
  textColor: t.Optional(hex),
});

export const updateBody = t.Partial(createBody);

export const idParam = t.Object({ id: t.Number() });

export type CreateBody = typeof createBody.static;
export type UpdateBody = typeof updateBody.static;
