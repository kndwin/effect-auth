import { useState } from "react";
import { useAuthMachine } from "./auth/useAuthMachine";

export function App() {
  const auth = useAuthMachine();
  const [email, setEmail] = useState("alice@example.com");
  const [password, setPassword] = useState("correct-horse-battery-staple");
  const [name, setName] = useState("Alice");
  const { state } = auth;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>example-postgres-react</h1>
        <span style={{ fontSize: 12, opacity: 0.6 }}>
          server: {import.meta.env.VITE_API_URL ?? "vite /auth → :3000"} · machine: {state.path}
        </span>
      </header>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
        {(state.path === "Checking" || state.path === "SigningOut") && (
          <p>{state.path === "Checking" ? "Checking session…" : "Signing out…"}</p>
        )}

        {state.path === "SignedOut" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              auth.sendSignIn(email, password);
            }}
            style={{ display: "grid", gap: 12 }}
          >
            <h2 style={{ margin: 0 }}>Sign in</h2>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 13, opacity: 0.7 }}>Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="alice@example.com" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 13, opacity: 0.7 }}>Password</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 13, opacity: 0.7 }}>Name (for sign-up)</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alice" style={inputStyle} />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={auth.busy} style={btnPrimary}>
                {auth.busy ? "…" : "Sign in"}
              </button>
              <button type="button" disabled={auth.busy} onClick={() => auth.sendSignUp(email, password, name)} style={btnSecondary}>
                Sign up
              </button>
              <button type="button" onClick={() => auth.sendCheckSession()} style={btnSecondary}>
                Re-check session
              </button>
            </div>
          </form>
        )}

        {(state.path === "SigningIn" || state.path === "SigningUp") && (
          <p>
            {state.path} as {state.value.email}…
          </p>
        )}

        {state.path === "Authenticated" && (
          <div style={{ display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0 }}>Authenticated</h2>
            <pre style={preStyle}>{JSON.stringify(state.value.user, null, 2)}</pre>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => auth.sendSignOut()} disabled={auth.busy} style={btnPrimary}>
                Sign out
              </button>
              <button onClick={() => auth.sendCheckSession()} style={btnSecondary}>
                Refresh session
              </button>
            </div>
          </div>
        )}

        {state.path === "Failure" && (
          <div style={{ display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0, color: "#dc2626" }}>Failure</h2>
            <pre style={{ ...preStyle, borderColor: "#fecaca", background: "#fef2f2" }}>{state.value.reason}</pre>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => auth.sendRetry()} style={btnPrimary}>
                Retry → SignedOut
              </button>
              <button onClick={() => auth.sendCheckSession()} style={btnSecondary}>
                Check session
              </button>
            </div>
          </div>
        )}
      </div>

      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", fontSize: 13 }}>Machine snapshot</summary>
        <pre style={preStyle}>{JSON.stringify(state, null, 2)}</pre>
      </details>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 14,
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #111827",
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
};

const btnSecondary: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
};

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: 12,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  overflow: "auto",
  fontSize: 12,
};
