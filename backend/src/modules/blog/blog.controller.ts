/**
 * Controller del módulo blog — capa HTTP (rutas Elysia).
 *
 * Dos superficies:
 *  - PRIVADA (requireAuth): /blog (mi blog) + /blog/posts (CRUD de mis posts).
 *  - PÚBLICA (sin auth):    /public/blog/:slug y /public/blog/:slug/posts/:postSlug
 *    — las consume el frontend del tenant (slug.azonline.com.ar).
 */
import { Elysia } from "elysia";
import { authPlugin } from "../../shared/auth.plugin";
import { blogService } from "./blog.service";
import {
  createPostBody,
  updatePostBody,
  updateBlogBody,
  postIdParam,
  slugParam,
  blogPostSlugParams,
} from "./blog.model";

// ---- Rutas privadas (mi blog) ----
export const blogController = new Elysia({ prefix: "/blog", tags: ["blog"] })
  .use(authPlugin)

  .get("/", ({ user, status }) => {
    const blog = blogService.getMine(user.id);
    return blog ?? status(404, { error: "No tenés un blog provisionado." });
  }, { requireAuth: true, detail: { summary: "Mi blog" } })

  .patch("/", ({ user, body, status }) => {
    const blog = blogService.updateMine(user.id, body);
    return blog ?? status(404, { error: "No tenés un blog." });
  }, { requireAuth: true, body: updateBlogBody, detail: { summary: "Editar mi blog" } })

  .get("/posts", ({ user }) => blogService.listPosts(user.id), {
    requireAuth: true,
    detail: { summary: "Mis posts" },
  })

  .get("/posts/:id", ({ user, params, status }) => {
    const post = blogService.getPost(user.id, params.id);
    return post ?? status(404, { error: "Post no encontrado." });
  }, { requireAuth: true, params: postIdParam, detail: { summary: "Ver un post propio" } })

  .post("/posts", ({ user, body, status }) => {
    const result = blogService.createPost(user.id, body);
    if ("error" in result) return status(409, { error: "No tenés un blog provisionado." });
    return status(201, result);
  }, { requireAuth: true, body: createPostBody, detail: { summary: "Crear post" } })

  .patch("/posts/:id", ({ user, params, body, status }) => {
    const post = blogService.updatePost(user.id, params.id, body);
    return post ?? status(404, { error: "Post no encontrado." });
  }, { requireAuth: true, params: postIdParam, body: updatePostBody, detail: { summary: "Editar post" } })

  .delete("/posts/:id", ({ user, params, status }) => {
    const ok = blogService.deletePost(user.id, params.id);
    return ok ? { ok: true } : status(404, { error: "Post no encontrado." });
  }, { requireAuth: true, params: postIdParam, detail: { summary: "Borrar post" } });

// ---- Rutas públicas (consumidas por el blog del tenant) ----
export const publicBlogController = new Elysia({ prefix: "/public/blog", tags: ["public"] })
  .get("/:slug", ({ params, status }) => {
    const view = blogService.publicView(params.slug);
    return view ?? status(404, { error: "Blog no encontrado." });
  }, { params: slugParam, detail: { summary: "Vista pública de un blog" } })

  .get("/:slug/posts/:postSlug", ({ params, status }) => {
    const post = blogService.publicPost(params.slug, params.postSlug);
    return post ?? status(404, { error: "Post no encontrado." });
  }, { params: blogPostSlugParams, detail: { summary: "Post público" } });
