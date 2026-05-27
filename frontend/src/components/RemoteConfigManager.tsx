import { useCallback, useEffect, useState } from "react";
import { api } from "../eden";
import { useRealtime, type RealtimeEvent } from "../hooks/useRealtime";
import { ConfigEditor } from "./ConfigEditor";
import { ConfigPreview } from "./ConfigPreview";
import { VersionHistory } from "./VersionHistory";

export interface RemoteConfig {
  id: number;
  name: string;
  title: string | null;
  description: string | null;
  url: string | null;
  image: string | null;
  bgColor: string | null;
  textColor: string | null;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export function RemoteConfigManager() {
  const [configs, setConfigs] = useState<RemoteConfig[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string>("");

  const selected = configs.find((c) => c.id === selectedId) ?? null;

  const load = useCallback(async () => {
    const { data } = await api["remote-configs"].get();
    if (data && "data" in data) {
      setConfigs(data.data as RemoteConfig[]);
      setSelectedId((prev) => prev ?? (data.data as RemoteConfig[])[0]?.id ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Tiempo real: aplicar eventos del servidor sin recargar ----
  const onEvent = useCallback((e: RealtimeEvent) => {
    if (e.type === "config.created") {
      const rc = e.data as RemoteConfig;
      setConfigs((prev) => (prev.some((c) => c.id === rc.id) ? prev : [rc, ...prev]));
    } else if (e.type === "config.updated" || e.type === "config.restored") {
      const rc = e.data as RemoteConfig;
      setConfigs((prev) => prev.map((c) => (c.id === rc.id ? rc : c)));
      setFlash(e.type === "config.restored" ? `Restaurada → v${rc.version}` : `Actualizada → v${rc.version}`);
      setTimeout(() => setFlash(""), 1800);
    } else if (e.type === "config.deleted") {
      const id = (e.data as { id: number }).id;
      setConfigs((prev) => prev.filter((c) => c.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
    }
  }, []);

  const { status } = useRealtime(onEvent);

  async function createNew() {
    const { data } = await api["remote-configs"].post({ name: "nueva-config", bgColor: "#14b8a6", textColor: "#04120f" });
    if (data && "data" in data) {
      const rc = (data as { data: RemoteConfig }).data;
      setConfigs((prev) => (prev.some((c) => c.id === rc.id) ? prev : [rc, ...prev]));
      setSelectedId(rc.id);
    }
  }

  async function remove(id: number) {
    await api["remote-configs"]({ id }).delete();
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  if (loading) return <div className="spinner" style={{ margin: "4rem auto" }} />;

  return (
    <div className="rcm">
      <aside className="rcm__list">
        <div className="rcm__list-head">
          <h2>Remote Configs</h2>
          <span className={`dot dot--${status}`} title={`Tiempo real: ${status}`} />
        </div>
        <button className="btn btn--primary rcm__new" onClick={createNew}>
          + Nueva
        </button>
        <ul>
          {configs.map((c) => (
            <li
              key={c.id}
              className={`rcm__item ${c.id === selectedId ? "is-active" : ""}`}
              onClick={() => setSelectedId(c.id)}
            >
              <span className="rcm__swatch" style={{ background: c.bgColor ?? "#222" }} />
              <span className="rcm__item-name">{c.name}</span>
              <span className="rcm__ver">v{c.version}</span>
            </li>
          ))}
          {configs.length === 0 && <li className="rcm__empty">Sin configs todavía</li>}
        </ul>
      </aside>

      <section className="rcm__main">
        {flash && <div className="rcm__flash">{flash}</div>}
        {selected ? (
          <>
            <div className="rcm__editor-row">
              <ConfigEditor config={selected} onDelete={() => remove(selected.id)} />
              <ConfigPreview config={selected} />
            </div>
            <VersionHistory configId={selected.id} currentVersion={selected.version} />
          </>
        ) : (
          <div className="rcm__placeholder">Elegí o creá una config para empezar.</div>
        )}
      </section>
    </div>
  );
}
