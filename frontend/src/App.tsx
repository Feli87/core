import { useEffect, useState } from "react";
import { api } from "./eden";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { TenantBlog } from "./components/TenantBlog";

export interface SessionUser {
  username: string;
  role: string;
}

/**
 * Resuelve el slug del tenant desde el hostname.
 * - core.azonline.com.ar / www / apex / localhost → null (app de gestión)
 * - <slug>.azonline.com.ar → slug (blog público del tenant)
 */
function resolveTenantSlug(): string | null {
  const host = window.location.hostname;
  // dev local
  if (host === "localhost" || host === "127.0.0.1" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    // permite ?tenant=slug para probar en dev
    const t = new URLSearchParams(window.location.search).get("tenant");
    return t || null;
  }
  const base = ".azonline.com.ar";
  if (!host.endsWith(base)) return null;
  const sub = host.slice(0, -base.length); // lo de antes de .azonline.com.ar
  // Subdominios reales del dominio (no son blogs de tenant). Mantener en sync
  // con la zona DNS para que core nunca los interprete como blog.
  const reserved = new Set([
    "core", "core-ingress", "www", "", "mail", "webmail", "vault",
    "back", "dev", "dev-backend", "mcp", "opendata", "rss", "mapa",
    "umd-map", "umd-map-dev", "landing-demo",
  ]);
  if (reserved.has(sub) || sub.includes(".")) return null;
  return sub;
}

export function App() {
  const tenantSlug = resolveTenantSlug();
  if (tenantSlug) return <TenantBlog slug={tenantSlug} />;
  return <CoreApp />;
}

function CoreApp() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.me
      .get()
      .then(({ data }) => {
        if (data && "user" in data) setUser(data.user);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await api.auth.logout.post().catch(() => {});
    setUser(null);
  }

  if (loading) {
    return (
      <div className="screen screen--center">
        <div className="spinner" aria-label="Cargando" />
      </div>
    );
  }

  return user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <Login onSuccess={setUser} />
  );
}
