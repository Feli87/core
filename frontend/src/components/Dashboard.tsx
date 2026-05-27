import { useEffect, useState } from "react";
import { api } from "../eden";
import type { SessionUser } from "../App";

interface DashData {
  message: string;
  role: string;
  node: string;
  stack: string[];
  timestamp: string;
}

export function Dashboard({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [data, setData] = useState<DashData | null>(null);

  useEffect(() => {
    api.secure.dashboard.get().then(({ data }) => {
      if (data && "message" in data) setData(data as DashData);
    });
  }, []);

  return (
    <div className="screen dash">
      <header className="dash__bar">
        <div className="dash__id">
          <span className="dash__logo">◉</span>
          <strong>Core</strong>
        </div>
        <div className="dash__user">
          <span className="dash__role">{user.role}</span>
          <span>{user.username}</span>
          <button className="btn btn--ghost" onClick={onLogout}>
            Salir
          </button>
        </div>
      </header>

      <main className="dash__body">
        <div className="card dash__panel">
          <h1 className="dash__title">{data?.message ?? `Bienvenido, ${user.username}`}</h1>
          <p className="dash__lead">
            Estás dentro del núcleo seguro de AZONLINE. Sesión protegida con cookie
            httpOnly, TLS y verificación JWT. Backend type-safe de extremo a extremo.
          </p>

          <div className="dash__grid">
            <div className="stat">
              <span className="stat__k">Nodo</span>
              <span className="stat__v">{data?.node ?? "core"}</span>
            </div>
            <div className="stat">
              <span className="stat__k">Rol</span>
              <span className="stat__v">{user.role}</span>
            </div>
            <div className="stat">
              <span className="stat__k">Sesión</span>
              <span className="stat__v">Activa</span>
            </div>
          </div>

          {data?.stack && (
            <div className="dash__stack">
              <span className="dash__stack-label">Stack</span>
              <div className="dash__chips">
                {data.stack.map((s) => (
                  <span className="chip" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data?.timestamp && (
            <p className="dash__ts">
              Verificado: {new Date(data.timestamp).toLocaleString("es-AR")}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
