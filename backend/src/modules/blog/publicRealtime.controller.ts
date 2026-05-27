/**
 * Controller de tiempo real PÚBLICO para el blog del tenant.
 *
 * El sitio público (slug.azonline.com.ar) abre un WS a /public/realtime?slug=<slug>.
 * El server resuelve el ownerId DESDE el slug (no confía en el cliente) y suscribe
 * la conexión al canal de ese dueño, reenviando solo eventos de branding/posts.
 * Así, cuando el dueño edita su branding o publica un post, el blog público se
 * actualiza al instante — sin autenticación (es contenido público).
 */
import { Elysia, t } from "elysia";
import { blogRepository } from "./blog.repository";
import { hub, type RealtimeEvent } from "../../shared/hub";

const PUBLIC_TYPES = new Set<RealtimeEvent["type"]>([
  "config.updated",
  "config.restored",
  "post.created",
  "post.updated",
  "post.published",
  "post.unpublished",
  "post.deleted",
]);

export const publicRealtimeController = new Elysia({ tags: ["public"] }).ws(
  "/public/realtime",
  {
    query: t.Object({ slug: t.String({ maxLength: 80 }) }),
    open(ws) {
      const slug = ws.data.query.slug;
      const blog = slug ? blogRepository.publicBlogBySlug(slug) : undefined;
      if (!blog) {
        ws.send({ type: "error", message: "Blog no encontrado" });
        ws.close();
        return;
      }
      const ownerId = blog.userId;
      const unsubscribe = hub.subscribe(ownerId, (event: RealtimeEvent) => {
        // solo reenviamos eventos públicos (branding + posts), nunca otros datos
        if (PUBLIC_TYPES.has(event.type)) ws.send(event);
      });
      (ws.data as { unsubscribe?: () => void }).unsubscribe = unsubscribe;
      ws.send({ type: "ready", slug: blog.slug, at: Date.now() });
    },
    message(ws, message) {
      if (message === "ping" || (typeof message === "object" && message && (message as { type?: string }).type === "ping")) {
        ws.send({ type: "pong", at: Date.now() });
      }
    },
    close(ws) {
      const unsub = (ws.data as { unsubscribe?: () => void }).unsubscribe;
      if (unsub) unsub();
    },
  }
);
