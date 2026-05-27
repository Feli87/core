/**
 * Hub de tiempo real (pub/sub en memoria).
 *
 * Desacoplado de Elysia: cualquier capa publica eventos y los sockets
 * suscritos al canal de un usuario los reciben. Un "canal" = un userId, así
 * cada usuario solo ve los cambios de SUS propias configs.
 *
 * El servicio NO conoce los sockets; solo llama hub.publish(userId, evento).
 * El controller WS registra/desregistra cada conexión.
 */

export interface RealtimeEvent {
  type:
    | "config.created"
    | "config.updated"
    | "config.deleted"
    | "config.restored"
    | "post.created"
    | "post.updated"
    | "post.published"
    | "post.unpublished"
    | "post.deleted";
  // configId para eventos de remote-config; postId/blogId para eventos de blog.
  configId?: number;
  postId?: number;
  blogId?: number;
  // payload libre (la config/post actualizado, o { id } en delete)
  data: unknown;
  version?: number;
  at: number;
}

type Sink = (event: RealtimeEvent) => void;

class RealtimeHub {
  // userId → set de sinks (una conexión WS = un sink)
  private channels = new Map<number, Set<Sink>>();

  subscribe(userId: number, sink: Sink): () => void {
    let set = this.channels.get(userId);
    if (!set) {
      set = new Set();
      this.channels.set(userId, set);
    }
    set.add(sink);
    // devuelve la función de desuscripción
    return () => {
      const s = this.channels.get(userId);
      if (!s) return;
      s.delete(sink);
      if (s.size === 0) this.channels.delete(userId);
    };
  }

  publish(userId: number, event: Omit<RealtimeEvent, "at">) {
    const set = this.channels.get(userId);
    if (!set || set.size === 0) return;
    const full: RealtimeEvent = { ...event, at: Date.now() };
    for (const sink of set) {
      try {
        sink(full);
      } catch {
        // un sink roto no debe tumbar el resto
      }
    }
  }

  /** Cuántas conexiones activas tiene un usuario (debug/health). */
  countFor(userId: number): number {
    return this.channels.get(userId)?.size ?? 0;
  }
}

export const hub = new RealtimeHub();
