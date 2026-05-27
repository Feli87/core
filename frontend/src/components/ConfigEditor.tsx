import { useEffect, useRef, useState } from "react";
import { api } from "../eden";
import type { RemoteConfig } from "./RemoteConfigManager";

const FIELDS: { key: keyof RemoteConfig; label: string; type?: string }[] = [
  { key: "name", label: "Nombre (interno)" },
  { key: "title", label: "Título" },
  { key: "description", label: "Descripción" },
  { key: "url", label: "URL" },
  { key: "image", label: "Imagen (URL)" },
];

/**
 * Editor con autosave: al cambiar un campo, espera 600ms sin tipeo y hace
 * PATCH. El backend crea una versión nueva y emite el evento por socket, que
 * el manager aplica (sin recargar).
 */
export function ConfigEditor({ config, onDelete }: { config: RemoteConfig; onDelete: () => void }) {
  const [draft, setDraft] = useState(config);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);

  // Si llega una actualización externa (otra pestaña/usuario), sincronizamos
  // el draft salvo que el usuario esté editando ese instante.
  useEffect(() => {
    setDraft(config);
  }, [config.id, config.version]);

  function edit<K extends keyof RemoteConfig>(key: K, value: RemoteConfig[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(key, value), 600);
  }

  async function save<K extends keyof RemoteConfig>(key: K, value: RemoteConfig[K]) {
    setSaving(true);
    await api["remote-configs"]({ id: config.id }).patch({ [key]: value ?? undefined });
    setSaving(false);
  }

  return (
    <div className="card editor">
      <div className="editor__head">
        <h3>Editar</h3>
        <span className="editor__state">{saving ? "Guardando…" : `v${config.version}`}</span>
      </div>

      {FIELDS.map((f) => (
        <label className="field" key={f.key}>
          <span className="field__label">{f.label}</span>
          <input
            className="field__input"
            value={(draft[f.key] as string) ?? ""}
            onChange={(e) => edit(f.key, e.target.value as RemoteConfig[typeof f.key])}
          />
        </label>
      ))}

      <div className="editor__colors">
        <label className="field">
          <span className="field__label">Fondo</span>
          <input
            type="color"
            className="field__color"
            value={draft.bgColor ?? "#14b8a6"}
            onChange={(e) => edit("bgColor", e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Texto</span>
          <input
            type="color"
            className="field__color"
            value={draft.textColor ?? "#04120f"}
            onChange={(e) => edit("textColor", e.target.value)}
          />
        </label>
      </div>

      <button className="btn btn--danger" onClick={onDelete}>
        Eliminar config
      </button>
    </div>
  );
}
