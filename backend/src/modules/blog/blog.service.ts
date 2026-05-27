/**
 * Service del módulo blog — lógica de negocio.
 * - provision(): provisiona un blog completo al registrarse un usuario.
 * - CRUD de posts (scopeado por dueño) con publish/unpublish y eventos en vivo.
 * - lectura pública por slug de subdominio.
 * Publica al hub en el canal del DUEÑO del blog, así el sitio público (suscrito
 * a ese canal) refleja cambios en tiempo real.
 */
import { blogRepository, type ProvisionResult } from "./blog.repository";
import { hub } from "../../shared/hub";
import type { CreatePostBody, UpdatePostBody, UpdateBlogBody } from "./blog.model";
import type { BlogRow, PostRow } from "./blog.schema";

/** Convierte un texto libre en un slug url-safe. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";
}

/** Normaliza un username a un slug de subdominio válido. */
export function usernameToSlug(username: string): string {
  return slugify(username) || "blog";
}

export const blogService = {
  /** Provisiona el blog inicial de un usuario (llamado desde el signup). */
  provisionFor(userId: number, username: string): ProvisionResult {
    const slug = usernameToSlug(username);
    const display = username.charAt(0).toUpperCase() + username.slice(1);
    return blogRepository.provision({
      userId,
      username,
      slug,
      title: `El blog de ${display}`,
      tagline: "Pensamientos, notas y novedades.",
      branding: {
        name: `${slug}-branding`,
        title: `El blog de ${display}`,
        description: "Un espacio propio, recién provisionado. Editá este branding desde tu panel.",
        url: `https://${slug}.azonline.com.ar`,
        bgColor: "#0d1117",
        textColor: "#e6edf3",
      },
      welcome: {
        slug: "bienvenida",
        title: "¡Bienvenido a tu blog!",
        excerpt: "Tu espacio quedó listo. Así podés empezar a publicar.",
        body: [
          `# ¡Hola, ${display}! 👋`,
          "",
          "Tu blog fue provisionado automáticamente al registrarte. Esto es lo que ya tenés:",
          "",
          "- **Tu subdominio propio**: viví en `" + `${slug}.azonline.com.ar` + "`.",
          "- **Branding editable en vivo**: cambiá colores, título y descripción desde tu panel y se refleja al instante.",
          "- **Publicación de posts**: escribí en _markdown_, guardá como borrador y publicá cuando quieras.",
          "",
          "Editá o borrá este post de bienvenida cuando estés listo. ¡A escribir! ✍️",
        ].join("\n"),
      },
    });
  },

  getMine(userId: number): BlogRow | undefined {
    return blogRepository.findByUser(userId);
  },

  updateMine(userId: number, patch: UpdateBlogBody): BlogRow | undefined {
    const blog = blogRepository.findByUser(userId);
    if (!blog) return undefined;
    const now = Math.floor(Date.now() / 1000);
    const updated = blogRepository.updateBlog(blog.id, { ...patch, updatedAt: now });
    return updated;
  },

  listPosts(userId: number): PostRow[] {
    return blogRepository.listPostsByUser(userId);
  },

  getPost(userId: number, postId: number): PostRow | undefined {
    return blogRepository.findOwnedPost(userId, postId);
  },

  createPost(userId: number, data: CreatePostBody): PostRow | { error: string } {
    const blog = blogRepository.findByUser(userId);
    if (!blog) return { error: "no-blog" };
    const baseSlug = data.slug ? slugify(data.slug) : slugify(data.title);
    let slug = baseSlug;
    let n = 1;
    while (blogRepository.slugTaken(blog.id, slug)) slug = `${baseSlug}-${++n}`;

    const now = Math.floor(Date.now() / 1000);
    const status = data.status ?? "draft";
    const post = blogRepository.insertPost({
      blogId: blog.id,
      slug,
      title: data.title,
      excerpt: data.excerpt ?? null,
      body: data.body ?? "",
      coverImage: data.coverImage ?? null,
      status,
      publishedAt: status === "published" ? now : null,
      createdAt: now,
      updatedAt: now,
    });
    hub.publish(userId, {
      type: status === "published" ? "post.published" : "post.created",
      postId: post.id,
      blogId: blog.id,
      data: post,
    });
    return post;
  },

  updatePost(userId: number, postId: number, patch: UpdatePostBody): PostRow | undefined {
    const blog = blogRepository.findByUser(userId);
    if (!blog) return undefined;
    const current = blogRepository.findOwnedPost(userId, postId);
    if (!current) return undefined;

    const set: Partial<PostRow> = { ...patch };
    if (patch.slug) {
      let slug = slugify(patch.slug);
      let n = 1;
      const base = slug;
      while (blogRepository.slugTaken(blog.id, slug, postId)) slug = `${base}-${++n}`;
      set.slug = slug;
    }

    // transición de estado → setear/limpiar publishedAt
    let transition: "post.published" | "post.unpublished" | null = null;
    if (patch.status && patch.status !== current.status) {
      if (patch.status === "published") {
        set.publishedAt = Math.floor(Date.now() / 1000);
        transition = "post.published";
      } else {
        set.publishedAt = null;
        transition = "post.unpublished";
      }
    }

    const updated = blogRepository.updatePost(userId, postId, set);
    if (updated) {
      hub.publish(userId, {
        type: transition ?? "post.updated",
        postId: updated.id,
        blogId: blog.id,
        data: updated,
      });
    }
    return updated;
  },

  deletePost(userId: number, postId: number): boolean {
    const blog = blogRepository.findByUser(userId);
    if (!blog) return false;
    const ok = blogRepository.deletePost(userId, postId);
    if (ok) {
      hub.publish(userId, { type: "post.deleted", postId, blogId: blog.id, data: { id: postId } });
    }
    return ok;
  },

  // ---- Lectura pública ----
  publicView(slug: string) {
    const blog = blogRepository.publicBlogBySlug(slug);
    if (!blog) return undefined;
    const branding = blog.brandingConfigId
      ? blogRepository.brandingConfig(blog.brandingConfigId)
      : undefined;
    const postsList = blogRepository.publishedPosts(blog.id);
    return {
      blog: { id: blog.id, slug: blog.slug, title: blog.title, tagline: blog.tagline, ownerId: blog.userId },
      branding: branding
        ? {
            title: branding.title,
            description: branding.description,
            image: branding.image,
            bgColor: branding.bgColor,
            textColor: branding.textColor,
            version: branding.version,
          }
        : null,
      posts: postsList.map((p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        coverImage: p.coverImage,
        publishedAt: p.publishedAt,
      })),
    };
  },

  publicPost(slug: string, postSlug: string) {
    const blog = blogRepository.publicBlogBySlug(slug);
    if (!blog) return undefined;
    const post = blogRepository.publicPost(blog.id, postSlug);
    if (!post) return undefined;
    return {
      ownerId: blog.userId,
      blogSlug: blog.slug,
      blogTitle: blog.title,
      post: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        coverImage: post.coverImage,
        publishedAt: post.publishedAt,
      },
    };
  },
};
