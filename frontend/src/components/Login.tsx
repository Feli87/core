import { useState, type FormEvent } from "react";
import { api } from "../eden";
import type { SessionUser } from "../App";

type Mode = "login" | "signup";

export function Login({ onSuccess }: { onSuccess: (u: SessionUser) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ url: string; slug: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        const { data, error } = await api.auth.login.post({ username, password });
        if (error) {
          setError(extractError(error.value, "Error de acceso"));
          return;
        }
        if (data && "user" in data) onSuccess(data.user);
      } else {
        const { data, error } = await api.auth.signup.post({ username, password });
        if (error) {
          setError(extractError(error.value, "No se pudo registrar"));
          return;
        }
        if (data && "user" in data) {
          // mostramos brevemente la URL provisionada y entramos
          if ("blog" in data && data.blog) setCreated({ url: data.blog.url, slug: data.blog.slug });
          setTimeout(() => onSuccess(data.user), 1400);
        }
      }
    } catch {
      setError("No se pudo conectar con el núcleo");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="screen screen--center login-bg">
        <main className="card login login--done">
          <span className="login__logo">✓</span>
          <h1 className="login__title">¡Tu blog está listo!</h1>
          <p className="login__sub">Provisionamos tu espacio en</p>
          <code className="login__url">{created.slug}.azonline.com.ar</code>
          <p className="login__foot">Entrando a tu panel…</p>
        </main>
      </div>
    );
  }

  const isSignup = mode === "signup";

  return (
    <div className="screen screen--center login-bg">
      <main className="card login">
        <div className="login__brand">
          <span className="login__logo">◉</span>
          <h1 className="login__title">Core</h1>
          <p className="login__sub">Núcleo seguro · AZONLINE</p>
        </div>

        <div className="login__tabs">
          <button
            type="button"
            className={`login__tab ${!isSignup ? "is-active" : ""}`}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Ingresar
          </button>
          <button
            type="button"
            className={`login__tab ${isSignup ? "is-active" : ""}`}
            onClick={() => { setMode("signup"); setError(""); }}
          >
            Crear cuenta
          </button>
        </div>

        <form className="login__form" onSubmit={submit} autoComplete="on">
          <label className="field">
            <span className="field__label">Usuario {isSignup && <em className="field__hint">— será tu subdominio</em>}</span>
            <input
              className="field__input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              autoComplete="username"
              required
              minLength={3}
              pattern={isSignup ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined}
              autoFocus
            />
            {isSignup && username && (
              <span className="field__preview">{username}.azonline.com.ar</span>
            )}
          </label>

          <label className="field">
            <span className="field__label">Contraseña</span>
            <input
              className="field__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={8}
            />
          </label>

          {error && <p className="login__error" role="alert">{error}</p>}

          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? "Procesando…" : isSignup ? "Crear mi blog" : "Ingresar"}
          </button>
        </form>

        <p className="login__foot">
          {isSignup
            ? "Al registrarte provisionamos tu subdominio + blog al instante."
            : "Conexión cifrada · sesión protegida con JWT"}
        </p>
      </main>
    </div>
  );
}

function extractError(value: unknown, fallback: string): string {
  return typeof value === "object" && value && "error" in value
    ? (value as { error: string }).error
    : fallback;
}
