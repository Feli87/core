import type { RemoteConfig } from "./RemoteConfigManager";

/**
 * Preview en vivo: renderiza la config tal como se vería. Se actualiza al
 * instante porque recibe el `config` del manager, que a su vez se actualiza
 * por WebSocket cuando hay un cambio (propio o de otra sesión).
 */
export function ConfigPreview({ config }: { config: RemoteConfig }) {
  return (
    <div className="card preview">
      <div className="preview__head">
        <h3>Preview en vivo</h3>
        <span className="preview__pill">v{config.version}</span>
      </div>

      <div
        className="preview__canvas"
        style={{
          background: config.bgColor ?? "#0c131b",
          color: config.textColor ?? "#e6f5f2",
        }}
      >
        {config.image && (
          <img className="preview__img" src={config.image} alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
        )}
        <h2 className="preview__title">{config.title || config.name}</h2>
        {config.description && <p className="preview__desc">{config.description}</p>}
        {config.url && (
          <a className="preview__cta" href={config.url} target="_blank" rel="noreferrer" style={{ borderColor: config.textColor ?? "#fff" }}>
            Ver más →
          </a>
        )}
      </div>
    </div>
  );
}
