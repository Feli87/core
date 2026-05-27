/**
 * TenantBlog — el blog público de un usuario, servido en slug.azonline.com.ar.
 * - Carga la vista pública (branding + posts publicados) por slug.
 * - Aplica el branding (colores/título) como CSS variables en vivo.
 * - Se suscribe al WS público del dueño: cuando edita branding o publica/edita
 *   posts, este sitio se actualiza al instante (sin recargar).
 * - Ruteo mínimo por hash: #/post/<slug> abre el post; sin hash, el índice.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRealtime, type RealtimeEvent } from "../hooks/useRealtime";
import { renderMarkdown } from "../lib/markdown";

interface Branding {
  title: string | null;
  description: string | null;
  image: string | null;
  bgColor: string | null;
  textColor: string | null;
  version: number;
}
interface PostCard {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: number | null;
}
interface PublicView {
  blog: { id: number; slug: string; title: string; tagline: string | null; ownerId: number };
  branding: Branding | null;
  posts: PostCard[];
}
interface FullPost {
  blogSlug: string;
  blogTitle: string;
  post: { slug: string; title: string; excerpt: string | null; body: string; coverImage: string | null; publishedAt: number | null };
}

function fmtDate(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" });
}

function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

export function TenantBlog({ slug }: { slug: string }) {
  const [view, setView] = useState<PublicView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<FullPost | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const hash = useHashRoute();

  const postSlug = useMemo(() => {
    const m = hash.match(/^#\/post\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [hash]);

  const loadView = useCallback(() => {
    fetch(`/api/public/blog/${encodeURIComponent(slug)}`, { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: PublicView) => { setView(d); setError(null); })
      .catch(() => setError("notfound"));
  }, [slug]);

  useEffect(() => { loadView(); }, [loadView]);

  // cargar post individual cuando cambia la ruta
  useEffect(() => {
    if (!postSlug) { setPost(null); return; }
    setPostLoading(true);
    fetch(`/api/public/blog/${encodeURIComponent(slug)}/posts/${encodeURIComponent(postSlug)}`, { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: FullPost) => setPost(d))
      .catch(() => setPost(null))
      .finally(() => setPostLoading(false));
  }, [postSlug, slug]);

  // tiempo real: cualquier cambio del dueño recarga la vista (y el post abierto)
  const onEvent = useCallback((e: RealtimeEvent) => {
    if (e.type === "ready" || e.type === "pong") return;
    loadView();
    if (postSlug) {
      fetch(`/api/public/blog/${encodeURIComponent(slug)}/posts/${encodeURIComponent(postSlug)}`, { credentials: "omit" })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d: FullPost) => setPost(d))
        .catch(() => { setPost(null); window.location.hash = ""; });
    }
  }, [loadView, postSlug, slug]);

  const { status } = useRealtime(onEvent, `/api/public/realtime?slug=${encodeURIComponent(slug)}`);

  // título de la pestaña del navegador (UX del blog público) — hook incondicional
  const pageTitle = view ? view.branding?.title || view.blog.title : null;
  useEffect(() => {
    if (!pageTitle) return;
    const prev = document.title;
    document.title = post?.post.title ? `${post.post.title} · ${pageTitle}` : pageTitle;
    return () => { document.title = prev; };
  }, [pageTitle, post?.post.title]);

  // aplicar branding como CSS variables
  const brand = view?.branding;
  const style = useMemo(
    () => ({
      ["--blog-bg" as string]: brand?.bgColor ?? "#0d1117",
      ["--blog-fg" as string]: brand?.textColor ?? "#e6edf3",
    }),
    [brand?.bgColor, brand?.textColor]
  );

  if (error === "notfound") {
    return (
      <div className="tenant tenant--empty">
        <div className="tenant__empty-card">
          <h1>Este blog no existe (todavía)</h1>
          <p>El subdominio <strong>{slug}.azonline.com.ar</strong> no está asignado.</p>
          <a className="tenant__cta" href="https://core.azonline.com.ar">Crear mi blog →</a>
        </div>
      </div>
    );
  }

  if (!view) {
    return <div className="tenant tenant--loading"><div className="spinner" /></div>;
  }

  const title = brand?.title || view.blog.title;
  const description = brand?.description || view.blog.tagline;

  return (
    <div className="tenant" style={style}>
      <span className={`tenant__live tenant__live--${status}`} title={`tiempo real: ${status}`}>
        <i /> en vivo
      </span>

      <header className="tenant__hero">
        {brand?.image && <img className="tenant__avatar" src={brand.image} alt="" />}
        <h1 className="tenant__title">
          <a href="#" onClick={(ev) => { ev.preventDefault(); window.location.hash = ""; }}>{title}</a>
        </h1>
        {description && <p className="tenant__tagline">{description}</p>}
      </header>

      <main className="tenant__main">
        {post || postLoading ? (
          <article className="tenant__article">
            <a className="tenant__back" href="#" onClick={(ev) => { ev.preventDefault(); window.location.hash = ""; }}>← Volver</a>
            {postLoading ? (
              <div className="spinner" />
            ) : post ? (
              <>
                {post.post.coverImage && <img className="tenant__cover" src={post.post.coverImage} alt="" />}
                <h2 className="tenant__post-title">{post.post.title}</h2>
                <time className="tenant__date">{fmtDate(post.post.publishedAt)}</time>
                <div className="tenant__body" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.post.body) }} />
              </>
            ) : (
              <p>Post no encontrado.</p>
            )}
          </article>
        ) : view.posts.length === 0 ? (
          <p className="tenant__none">Todavía no hay publicaciones. Volvé pronto. ✨</p>
        ) : (
          <ul className="tenant__list">
            {view.posts.map((p) => (
              <li key={p.slug} className="tenant__card">
                <a href={`#/post/${encodeURIComponent(p.slug)}`}>
                  {p.coverImage && <img className="tenant__card-img" src={p.coverImage} alt="" />}
                  <h3>{p.title}</h3>
                  {p.excerpt && <p>{p.excerpt}</p>}
                  <time className="tenant__date">{fmtDate(p.publishedAt)}</time>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="tenant__footer">
        <span>{title}</span>
        <a href="https://core.azonline.com.ar">Creá tu blog en azonline →</a>
      </footer>
    </div>
  );
}
