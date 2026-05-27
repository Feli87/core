import { useCallback, useEffect, useState } from "react";
import { api } from "../eden";

interface Version {
  id: number;
  version: number;
  name: string;
  title: string | null;
  bgColor: string | null;
  textColor: string | null;
  changeNote: string | null;
  createdBy: string | null;
  createdAt: number;
}

/**
 * Historial de versiones. Lista los snapshots (más nuevo arriba) y permite
 * restaurar cualquiera. El restore crea una versión NUEVA (no destructivo).
 * Se recarga al cambiar la versión actual (tras cada edición/restore).
 */
export function VersionHistory({ configId, currentVersion }: { configId: number; currentVersion: number }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api["remote-configs"]({ id: configId }).versions.get();
    if (data && "data" in data) setVersions(data.data as Version[]);
  }, [configId]);

  useEffect(() => {
    if (open) load();
  }, [open, load, currentVersion]);

  async function restore(version: number) {
    await api["remote-configs"]({ id: configId }).restore({ version }).post();
    // el evento por socket actualiza el manager; recargamos el historial
    load();
  }

  return (
    <div className="card history">
      <button className="history__toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "▾" : "▸"} Historial de versiones {open ? "" : `(${currentVersion})`}
      </button>

      {open && (
        <ul className="history__list">
          {versions.map((v) => (
            <li key={v.id} className={`history__row ${v.version === currentVersion ? "is-current" : ""}`}>
              <span className="history__swatch" style={{ background: v.bgColor ?? "#222" }} />
              <span className="history__v">v{v.version}</span>
              <span className="history__title">{v.title || v.name}</span>
              <span className="history__note">{v.changeNote ?? "—"}</span>
              <span className="history__when">{new Date(v.createdAt * 1000).toLocaleString("es-AR")}</span>
              {v.version === currentVersion ? (
                <span className="history__current">actual</span>
              ) : (
                <button className="btn btn--ghost history__restore" onClick={() => restore(v.version)}>
                  Restaurar
                </button>
              )}
            </li>
          ))}
          {versions.length === 0 && <li className="rcm__empty">Sin versiones</li>}
        </ul>
      )}
    </div>
  );
}
