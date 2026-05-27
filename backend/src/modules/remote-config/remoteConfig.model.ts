/**
 * DTOs del módulo remote-config.
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

// update permite los mismos campos (parciales) + una nota de cambio opcional
export const updateBody = t.Partial(
  t.Object({
    name: t.String({ minLength: 1, maxLength: 120 }),
    title: t.String({ maxLength: 200 }),
    description: t.String({ maxLength: 2000 }),
    url,
    image: url,
    bgColor: hex,
    textColor: hex,
    changeNote: t.String({ maxLength: 200 }),
  })
);

export const idParam = t.Object({ id: t.Number() });
export const versionParams = t.Object({ id: t.Number(), version: t.Number() });

export type CreateBody = typeof createBody.static;
export type UpdateBody = Omit<typeof updateBody.static, "changeNote">;
