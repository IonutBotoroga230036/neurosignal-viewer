import { useState } from "react";
import { login, signup } from "../lib/store.js";

export default function Login({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const submit = () => {
    try {
      const user = mode === "login" ? login(username, password) : signup(username, password);
      onAuth(user);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-ink-900 text-bone-100">
      <div className="w-80 space-y-5">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">NeuroSignal</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-bone-500">
            {mode === "login" ? "sign in" : "create account"}
          </p>
        </div>

        <div className="space-y-2">
          <input
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full rounded border border-ink-600 bg-ink-850 px-3 py-2 font-mono text-sm text-bone-100 focus:border-bone-500 focus:outline-none"
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full rounded border border-ink-600 bg-ink-850 px-3 py-2 font-mono text-sm text-bone-100 focus:border-bone-500 focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded border border-[#c4565640] bg-[#c4565610] px-2 py-1 font-mono text-[11px] text-[#d98a8a]">
            {error}
          </p>
        )}

        <button
          onClick={submit}
          className="w-full rounded bg-bone-100 py-2 font-mono text-sm text-ink-900 transition hover:bg-bone-300"
        >
          {mode === "login" ? "sign in" : "create account"}
        </button>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="w-full font-mono text-[11px] text-bone-500 transition hover:text-bone-300"
        >
          {mode === "login" ? "no account? create one" : "have an account? sign in"}
        </button>

        <p className="font-mono text-[10px] leading-relaxed text-bone-500">
          testing only. accounts are stored unencrypted in your browser. real
          auth (RBAC + SQL) comes later.
        </p>
      </div>
    </div>
  );
}
