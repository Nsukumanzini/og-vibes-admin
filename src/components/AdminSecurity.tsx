import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../api";
import type { AdminProfile } from "../types";
import { formatValue } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

type AdminRow = Record<string, unknown>;
type LoginRow = Record<string, unknown>;
type CandidateRow = Record<string, unknown>;

export default function AdminSecurity({ currentAdmin, onNotify }: { currentAdmin: AdminProfile; onNotify: (message: string, error?: boolean) => void }) {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [pendingRevoke, setPendingRevoke] = useState<AdminRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi<{ admins: AdminRow[]; logins: LoginRow[]; candidates: CandidateRow[] }>({ action: "admin_activity" });
      setAdmins(data.admins); setLogins(data.logins); setCandidates(data.candidates ?? []);
    } catch (error) { onNotify(error instanceof Error ? error.message : "Admin security information unavailable", true); }
    finally { setLoading(false); }
  }, [onNotify]);

  useEffect(() => { void load(); }, [load]);
  const activeVice = useMemo(() => admins.find((admin) => admin.access_role === "vice_admin" && admin.status === "active"), [admins]);
  const availableCandidates = useMemo(() => candidates.filter((candidate) => !admins.some((admin) => admin.user_id === candidate.id && admin.status === "active")), [admins, candidates]);

  async function updateVice(userId: string, status: "active" | "revoked") {
    setSaving(true);
    try {
      await adminApi({ action: "set_vice_admin", userId, status });
      onNotify(status === "active" ? "Vice Admin access granted. Existing sessions were revoked." : "Vice Admin access revoked immediately.");
      setSelectedUser(""); setPendingRevoke(null); await load();
    } catch (error) { onNotify(error instanceof Error ? error.message : "Administrator access could not be changed", true); }
    finally { setSaving(false); }
  }

  return <section className="workspace-panel">
    <header className="section-head"><div><p className="eyebrow">System security</p><h1>Administrator access</h1><p>One protected Owner and one operational Vice Admin keep authority clear and accountable.</p></div><button className="icon-button" onClick={() => void load()} aria-label="Refresh administrator activity">↻</button></header>
    {loading ? <div className="loading-state"><span className="spinner" />Loading secure activity…</div> : <>
      <div className="access-principles"><article><span>01</span><div><b>Owner</b><p>Full security, administrator, audit-export and irreversible-action authority.</p></div></article><article><span>02</span><div><b>Vice Admin</b><p>Daily academic, communication, moderation, safety, support and operational work without owner-only controls.</p></div></article><article><span>03</span><div><b>Immediate enforcement</b><p>Access changes apply to the next request and revoke refresh sessions.</p></div></article></div>
      <div className="admin-access-grid"><article className="admin-roster"><header><div><h2>Protected administrators</h2><p>{admins.filter((admin) => admin.status === "active").length} active secure account{admins.filter((admin) => admin.status === "active").length === 1 ? "" : "s"}</p></div><span className="security-chip">Least privilege</span></header><div>{admins.map((admin) => { const name = String(admin.nickname ?? "Administrator"); const role = admin.access_role === "owner" ? "Owner" : "Vice Admin"; return <div className="admin-account" key={String(admin.user_id ?? admin.id)}>{admin.photo_url ? <img src={String(admin.photo_url)} alt="" /> : <span>{name.slice(0, 1).toUpperCase()}</span>}<div><b>{name}</b><small>{String(admin.email ?? "No email")}</small><em>{role}</em></div><div className="admin-account-actions"><em className={`status ${admin.status === "active" ? "active" : "suspended"}`}>{admin.status === "active" ? "Active" : String(admin.status ?? "Inactive")}</em>{currentAdmin.can_manage_admins && admin.access_role === "vice_admin" && admin.status === "active" ? <button disabled={saving} onClick={() => setPendingRevoke(admin)}>Revoke access</button> : null}</div></div>; })}</div></article>
      <article className="admin-roster vice-assignment"><header><div><h2>{currentAdmin.can_manage_admins ? "Appoint Vice Admin" : "Your access"}</h2><p>{currentAdmin.can_manage_admins ? "Only the Owner can appoint or replace the Vice Admin." : "Vice Admin permissions are managed by the Owner."}</p></div><span className="security-chip">{currentAdmin.access_label}</span></header>{currentAdmin.can_manage_admins ? <div className="vice-form">{activeVice ? <div className="vice-filled"><span>✓</span><div><b>{String(activeVice.nickname ?? activeVice.email ?? "Vice Admin")}</b><p>The single Vice Admin position is filled. Revoke it before appointing someone else.</p></div></div> : <><label><span>Choose a trusted team member</span><select value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)}><option value="">Select a person…</option>{availableCandidates.map((candidate) => <option key={String(candidate.id)} value={String(candidate.id)}>{String(candidate.nickname ?? candidate.email ?? "Unnamed person")} · {String(candidate.email ?? "No email")}</option>)}</select></label><button className="button primary" disabled={!selectedUser || saving} onClick={() => void updateVice(selectedUser, "active")}>{saving ? "Securing access…" : "Appoint Vice Admin"}</button></>}</div> : <div className="security-note compact"><span>⌾</span><h3>Owner controls are protected</h3><p>You can run everyday operations, but cannot change administrator access, permissions, security settings, exports or hard-delete records.</p></div>}</article></div>
      <div className="data-card login-table"><header className="subsection-head"><div><h2>Administrator login history</h2><p>Most recent 100 secure sessions</p></div></header><div className="table-scroll"><table><thead><tr><th>Administrator</th><th>Signed in</th><th>Last active</th><th>Device</th><th>Network address</th></tr></thead><tbody>{logins.map((login) => <tr key={String(login.id)}><td><b>{String(login.email ?? "Unknown administrator")}</b></td><td>{formatValue(login.signed_in_at)}</td><td>{formatValue(login.last_seen_at)}</td><td><span className="device-cell">{friendlyDevice(login.user_agent)}</span></td><td>{String(login.ip_address ?? "Unavailable")}</td></tr>)}</tbody></table></div></div>
    </>}
    {pendingRevoke ? <ConfirmDialog title="Revoke Vice Admin access?" message={`${String(pendingRevoke.nickname ?? pendingRevoke.email ?? "This administrator")} will lose administrator access immediately and must sign in again if reappointed.`} confirmLabel="Revoke access" dangerous onCancel={() => setPendingRevoke(null)} onConfirm={() => void updateVice(String(pendingRevoke.user_id), "revoked")} /> : null}
  </section>;
}

function friendlyDevice(value: unknown) {
  const text = String(value ?? "");
  if (!text) return "Unknown device";
  const browser = text.includes("Edg/") ? "Microsoft Edge" : text.includes("Chrome/") ? "Google Chrome" : text.includes("Firefox/") ? "Firefox" : text.includes("Safari/") ? "Safari" : "Web browser";
  const platform = text.includes("Windows") ? "Windows" : text.includes("Android") ? "Android" : text.includes("iPhone") || text.includes("iPad") ? "iOS" : text.includes("Macintosh") ? "macOS" : "Unknown platform";
  return `${browser} on ${platform}`;
}
