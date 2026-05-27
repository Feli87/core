/**
 * Schema Drizzle del módulo blog (multi-tenant).
 *
 * - blogs: UN blog por usuario (userId unique). El `slug` es el subdominio
 *   (slug.azonline.com.ar). El branding vive en una remote-config (brandingConfigId),
 *   así reusamos versionado + tiempo real ya existentes para el aspecto del blog.
 * - posts: entradas del blog. `status` controla draft|published (publicación).
 *   El contenido es markdown; el render lo hace el frontend del tenant.
 */
import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { users } from "../auth/auth.schema";
import { remoteConfigs } from "../remote-config/remoteConfig.schema";

export const blogs = sqliteTable(
  "blogs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(), // = username → subdominio
    title: text("title").notNull(),
    tagline: text("tagline"),
    // branding como remote-config (FK), editable en vivo y versionada
    brandingConfigId: integer("branding_config_id").references(
      () => remoteConfigs.id,
      { onDelete: "set null" }
    ),
    createdAt: integer("created_at").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
  },
  (table) => [index("idx_blogs_slug").on(table.slug)]
);

export const posts = sqliteTable(
  "posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    blogId: integer("blog_id")
      .notNull()
      .references(() => blogs.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(), // único dentro del blog (validado en service)
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    body: text("body").notNull().default(""), // markdown
    coverImage: text("cover_image"),
    status: text("status").notNull().default("draft"), // draft | published
    publishedAt: integer("published_at"),
    createdAt: integer("created_at").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
  },
  (table) => [
    index("idx_posts_blog").on(table.blogId),
    index("idx_posts_blog_status").on(table.blogId, table.status),
  ]
);

export type BlogRow = typeof blogs.$inferSelect;
export type NewBlog = typeof blogs.$inferInsert;
export type PostRow = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
