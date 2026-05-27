/**
 * DTOs del módulo blog — validación runtime + tipos estáticos (typebox).
 */
import { t } from "elysia";

const url = t.String({ format: "uri", maxLength: 2048 });
// slug url-safe: minúsculas, números, guiones
const slug = t.String({ pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", minLength: 1, maxLength: 80 });

export const createPostBody = t.Object({
  title: t.String({ minLength: 1, maxLength: 200 }),
  slug: t.Optional(slug),
  excerpt: t.Optional(t.String({ maxLength: 500 })),
  body: t.Optional(t.String({ maxLength: 100_000 })),
  coverImage: t.Optional(url),
  status: t.Optional(t.Union([t.Literal("draft"), t.Literal("published")])),
});

export const updatePostBody = t.Partial(
  t.Object({
    title: t.String({ minLength: 1, maxLength: 200 }),
    slug,
    excerpt: t.String({ maxLength: 500 }),
    body: t.String({ maxLength: 100_000 }),
    coverImage: url,
    status: t.Union([t.Literal("draft"), t.Literal("published")]),
  })
);

export const updateBlogBody = t.Partial(
  t.Object({
    title: t.String({ minLength: 1, maxLength: 200 }),
    tagline: t.String({ maxLength: 280 }),
  })
);

export const postIdParam = t.Object({ id: t.Number() });
export const slugParam = t.Object({ slug: t.String({ maxLength: 80 }) });
export const blogPostSlugParams = t.Object({
  slug: t.String({ maxLength: 80 }),
  postSlug: t.String({ maxLength: 80 }),
});

export type CreatePostBody = typeof createPostBody.static;
export type UpdatePostBody = typeof updatePostBody.static;
export type UpdateBlogBody = typeof updateBlogBody.static;
