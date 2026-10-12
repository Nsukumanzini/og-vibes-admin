import { useState } from "react";
import { configurationReady, signIn } from "../api";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try { await signIn(email.trim(), password); onSuccess(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to sign in"); }
    finally { setLoading(false); }
  }
  return <main className="login-page"><div className="login-orb one" /><div className="login-orb two" /><section className="login-brand"><div className="brand-lockup"><span className="brand-mark">OG</span><span><b>OG VIBES</b><small>ADMIN CONTROL</small></span></div><div className="login-copy"><p className="eyebrow cyan">OG TECHNOLOGIES · SECURE OPERATIONS</p><h1>Lead the campus.<br /><em>Protect the vibe.</em></h1><p>A single command centre for academics, students, safety, content and every important operation behind OG Vibes.</p><div className="trust-row"><span>✓ Protected access</span><span>✓ Every action audited</span><span>✓ Live Supabase data</span></div></div></section><section className="login-panel"><form className="login-card" onSubmit={submit}><span className="login-icon">⌁</span><p className="eyebrow">Administrator access</p><h2>Welcome back</h2><p className="muted">Sign in with an active <b>Owner</b> or <b>Vice Admin</b> account.</p>{!configurationReady() && <div className="alert error">Production configuration is missing.</div>}{error && <div className="alert error">{error}</div>}<label className="form-field"><span>Email address</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@ogvibes.co.za" /></label><label className="form-field"><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label><button className="button primary login-button" disabled={loading || !configurationReady()}>{loading ? "Verifying access…" : "Enter control centre →"}</button><p className="login-help">Student, lecturer and unassigned administrator accounts are denied automatically.</p></form></section></main>;
}
