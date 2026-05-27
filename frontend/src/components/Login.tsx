import { useState, type FormEvent } from "react";
import { api } from "../eden";
import type { SessionUser } from "../App";

export function Login({ onSuccess }: { onSuccess: (u: SessionUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data, error } = await api.auth.login.post({ username, password });
      if (error) {
        const msg =
          typeof error.value === "object" && error.value && "error" in error.value
            ? (error.value as { error: string }).error
            : "Error de acceso";
        setError(msg);
        return;
      }
      if (data && "user" in data) onSuccess(data.user);
    } catch {
      setError("No se pudo conectar con el núcleo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen screen--center login-bg">
      <main className="card login">
        <div className="login__brand">
          <span className="login__logo">◉</span>
          <h1 className="login__title">Core</h1>
          <p className="login__sub">Núcleo seguro · AZONLINE</p>
        </div>

        <form className="login__form" onSubmit={submit} autoComplete="on">
          <label className="field">
            <span className="field__label">Usuario</span>
            <input
              className="field__input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              minLength={3}
              autoFocus
            />
          </label>

          <label className="field">
            <span className="field__label">Contraseña</span>
            <input
              className="field__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              minLength={8}
            />
          </label>

          {error && (
            <p className="login__error" role="alert">
              {error}
            </p>
          )}

          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? "Verificando…" : "Ingresar"}
          </button>
        </form>

        <p className="login__foot">Conexión cifrada · sesión protegida con JWT</p>
      </main>
    </div>
  );
}
