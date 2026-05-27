import { useEffect, useState } from "react";
import { api } from "./eden";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";

export interface SessionUser {
  username: string;
  role: string;
}

export function App() {
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
