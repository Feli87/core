/**
 * BlogManager — panel del dueño para gestionar su blog y publicar posts.
 * - Muestra la URL pública del blog (subdominio).
 * - Lista posts con su estado (borrador/publicado).
 * - Editor con título, slug, extracto, cuerpo markdown y cover.
 * - Publicar / despublicar / borrar. Todo se refleja en vivo en el sitio público.
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "../eden";

interface Blog {
  id: number;
  slug: string;
  title: string;
  tagline: string | null;
}
interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverImage: string | null;
  status: string;
  publishedAt: number | null;
  updatedAt: number;
}

const EMPTY = { title: "", slug: "", excerpt: "", body: "", coverImage: "" };

export function BlogManager() {
  const [blog, setBlog] = useState<Blog | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<Post | null>(null);
  const [draft, setDraft] = useState({ ...EMPTY });
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const loadPosts = useCallback(() => {
    api.blog.posts.get().then(({ data }) => {
      if (Array.isArray(data)) setPosts(data as Post[]);
    });
  }, []);

  useEffect(() => {
    api.blog.get().then(({ data }) => {
      if (data && "slug" in data) setBlog(data as Blog);
    });
    loadPosts();
  }, [loadPosts]);

  function startNew() {
    setEditing(null);
    setDraft({ ...EMPTY });
    setCreating(true);
    setMsg("");
  }
  function startEdit(p: Post) {
    setCreating(false);
    setEditing(p);
    setDraft({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? "",
      body: p.body,
      coverImage: p.coverImage ?? "",
    });
    setMsg("");
  }
  function cancel() {
    setEditing(null);
    setCreating(false);
    setDraft({ ...EMPTY });
  }

  async function save(publish: boolean) {
    setBusy(true);
    setMsg("");
    const payload: Record<string, unknown> = {
      title: draft.title,
      excerpt: draft.excerpt || undefined,
      body: draft.body || undefined,
      coverImage: draft.coverImage || undefined,
    };
    if (draft.slug) payload.slug = draft.slug;

    try {
      if (creating) {
        if (publish) payload.status = "published";
        const { data, error } = await api.blog.posts.post(payload as never);
        if (error) { setMsg("No se pudo crear el post."); return; }
        if (data) { cancel(); loadPosts(); setMsg("Post creado."); }
      } else if (editing) {
        if (publish) payload.status = "published";
        const { error } = await api.blog.posts({ id: editing.id }).patch(payload as never);
        if (error) { setMsg("No se pudo guardar."); return; }
        cancel(); loadPosts(); setMsg("Cambios guardados.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(p: Post) {
    const next = p.status === "published" ? "draft" : "published";
    await api.blog.posts({ id: p.id }).patch({ status: next } as never);
    loadPosts();
  }

  async function remove(p: Post) {
    if (!confirm(`¿Borrar "${p.title}"? No se puede deshacer.`)) return;
    await api.blog.posts({ id: p.id }).delete();
    if (editing?.id === p.id) cancel();
    loadPosts();
  }

  if (!blog) {
    return (
      <div className="card blogmgr">
        <p className="blogmgr__empty">No tenés un blog provisionado en esta cuenta.</p>
      </div>
    );
  }

  const blogUrl = `https://${blog.slug}.azonline.com.ar`;

  return (
    <section className="card blogmgr">
      <header className="blogmgr__head">
        <div>
          <h2 className="blogmgr__title">Tu blog</h2>
          <a className="blogmgr__url" href={blogUrl} target="_blank" rel="noopener noreferrer">
            {blog.slug}.azonline.com.ar ↗
          </a>
        </div>
        <button className="btn btn--primary" onClick={startNew}>+ Nuevo post</button>
      </header>

      {msg && <p className="blogmgr__msg">{msg}</p>}

      {(creating || editing) && (
        <div className="blogmgr__editor">
          <h3>{creating ? "Nuevo post" : `Editando: ${editing?.title}`}</h3>
          <label className="field">
            <span className="field__label">Título</span>
            <input className="field__input" value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </label>
          <div className="blogmgr__row">
            <label className="field">
              <span className="field__label">Slug (URL)</span>
              <input className="field__input" value={draft.slug} placeholder="auto desde el título"
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
            </label>
            <label className="field">
              <span className="field__label">Imagen de portada (URL)</span>
              <input className="field__input" value={draft.coverImage}
                onChange={(e) => setDraft({ ...draft, coverImage: e.target.value })} />
            </label>
          </div>
          <label className="field">
            <span className="field__label">Extracto</span>
            <input className="field__input" value={draft.excerpt}
              onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">Contenido (Markdown)</span>
            <textarea className="field__input blogmgr__textarea" rows={10} value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </label>
          <div className="blogmgr__actions">
            <button className="btn btn--ghost" onClick={cancel} disabled={busy}>Cancelar</button>
            <button className="btn" onClick={() => save(false)} disabled={busy || !draft.title}>
              Guardar borrador
            </button>
            <button className="btn btn--primary" onClick={() => save(true)} disabled={busy || !draft.title}>
              Publicar
            </button>
          </div>
        </div>
      )}

      <ul className="blogmgr__list">
        {posts.length === 0 && <li className="blogmgr__none">Todavía no escribiste nada.</li>}
        {posts.map((p) => (
          <li key={p.id} className="blogmgr__item">
            <div className="blogmgr__item-main">
              <span className={`blogmgr__badge blogmgr__badge--${p.status}`}>
                {p.status === "published" ? "publicado" : "borrador"}
              </span>
              <span className="blogmgr__item-title">{p.title}</span>
              <span className="blogmgr__item-slug">/{p.slug}</span>
            </div>
            <div className="blogmgr__item-actions">
              <button className="btn btn--ghost btn--sm" onClick={() => startEdit(p)}>Editar</button>
              <button className="btn btn--ghost btn--sm" onClick={() => togglePublish(p)}>
                {p.status === "published" ? "Despublicar" : "Publicar"}
              </button>
              <button className="btn btn--ghost btn--sm blogmgr__del" onClick={() => remove(p)}>Borrar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
