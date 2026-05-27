/**
 * Repository del módulo blog — única capa que toca la DB de blogs/posts.
 * Las operaciones de escritura de posts se scopean por dueño (vía join con blogs.userId).
 * `provision` crea, en UNA transacción atómica, la remote-config de branding +
 * el blog + un post de bienvenida (usado al registrarse un usuario).
 */
import { and, eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { blogs, posts, type BlogRow, type NewBlog, type PostRow, type NewPost } from "./blog.schema";
import { remoteConfigs, remoteConfigVersions } from "../remote-config/remoteConfig.schema";

export interface ProvisionResult {
  blog: BlogRow;
  brandingConfigId: number;
  welcomePostId: number;
}

export const blogRepository = {
  findByUser(userId: number): BlogRow | undefined {
    return db.select().from(blogs).where(eq(blogs.userId, userId)).get();
  },

  findBySlug(slug: string): BlogRow | undefined {
    return db.select().from(blogs).where(eq(blogs.slug, slug)).get();
  },

  /**
   * Provisión atómica de un blog nuevo para un usuario recién registrado:
   * remote-config de branding (v1 + snapshot) → blog (slug) → post de bienvenida.
   */
  provision(opts: {
    userId: number;
    username: string;
    slug: string;
    title: string;
    tagline: string;
    branding: {
      name: string;
      title: string;
      description: string;
      url: string;
      bgColor: string;
      textColor: string;
    };
    welcome: { slug: string; title: string; excerpt: string; body: string };
  }): ProvisionResult {
    const now = Math.floor(Date.now() / 1000);
    return db.transaction((tx) => {
      // 1) remote-config de branding (versión 1 + snapshot inmutable)
      const cfg = tx
        .insert(remoteConfigs)
        .values({
          userId: opts.userId,
          name: opts.branding.name,
          title: opts.branding.title,
          description: opts.branding.description,
          url: opts.branding.url,
          image: null,
          bgColor: opts.branding.bgColor,
          textColor: opts.branding.textColor,
          version: 1,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      tx.insert(remoteConfigVersions)
        .values({
          configId: cfg.id,
          version: 1,
          name: cfg.name,
          title: cfg.title,
          description: cfg.description,
          url: cfg.url,
          image: cfg.image,
          bgColor: cfg.bgColor,
          textColor: cfg.textColor,
          changeNote: "branding inicial (signup)",
          createdBy: opts.username,
          createdAt: now,
        })
        .run();

      // 2) blog
      const blog = tx
        .insert(blogs)
        .values({
          userId: opts.userId,
          slug: opts.slug,
          title: opts.title,
          tagline: opts.tagline,
          brandingConfigId: cfg.id,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      // 3) post de bienvenida (publicado)
      const post = tx
        .insert(posts)
        .values({
          blogId: blog.id,
          slug: opts.welcome.slug,
          title: opts.welcome.title,
          excerpt: opts.welcome.excerpt,
          body: opts.welcome.body,
          status: "published",
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      return { blog, brandingConfigId: cfg.id, welcomePostId: post.id };
    });
  },

  // ---- Posts (scope por dueño) ----
  listPostsByUser(userId: number): PostRow[] {
    const blog = this.findByUser(userId);
    if (!blog) return [];
    return db
      .select()
      .from(posts)
      .where(eq(posts.blogId, blog.id))
      .orderBy(desc(posts.createdAt))
      .all();
  },

  findOwnedPost(userId: number, postId: number): PostRow | undefined {
    const blog = this.findByUser(userId);
    if (!blog) return undefined;
    return db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.blogId, blog.id)))
      .get();
  },

  slugTaken(blogId: number, slug: string, exceptPostId?: number): boolean {
    const rows = db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.blogId, blogId), eq(posts.slug, slug)))
      .all();
    return rows.some((r) => r.id !== exceptPostId);
  },

  insertPost(data: NewPost): PostRow {
    return db.insert(posts).values(data).returning().get();
  },

  updateBlog(blogId: number, patch: Partial<NewBlog>): BlogRow | undefined {
    return db
      .update(blogs)
      .set(patch)
      .where(eq(blogs.id, blogId))
      .returning()
      .get();
  },

  updatePost(userId: number, postId: number, patch: Partial<NewPost>): PostRow | undefined {
    const blog = this.findByUser(userId);
    if (!blog) return undefined;
    return db
      .update(posts)
      .set({ ...patch, updatedAt: Math.floor(Date.now() / 1000) })
      .where(and(eq(posts.id, postId), eq(posts.blogId, blog.id)))
      .returning()
      .get();
  },

  deletePost(userId: number, postId: number): boolean {
    const blog = this.findByUser(userId);
    if (!blog) return false;
    const deleted = db
      .delete(posts)
      .where(and(eq(posts.id, postId), eq(posts.blogId, blog.id)))
      .returning()
      .all();
    return deleted.length > 0;
  },

  // ---- Lectura pública (por slug de subdominio) ----
  publicBlogBySlug(slug: string): BlogRow | undefined {
    return this.findBySlug(slug);
  },

  publishedPosts(blogId: number): PostRow[] {
    return db
      .select()
      .from(posts)
      .where(and(eq(posts.blogId, blogId), eq(posts.status, "published")))
      .orderBy(desc(posts.publishedAt))
      .all();
  },

  publicPost(blogId: number, slug: string): PostRow | undefined {
    return db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.blogId, blogId),
          eq(posts.slug, slug),
          eq(posts.status, "published")
        )
      )
      .get();
  },

  brandingConfig(configId: number) {
    return db.select().from(remoteConfigs).where(eq(remoteConfigs.id, configId)).get();
  },
};
