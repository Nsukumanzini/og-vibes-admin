import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api";
import { formatValue } from "../types";

type Notice = Record<string, unknown>;

function localInput(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.valueOf())) return "";
  return new Date(date.valueOf() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function NoticeManager({ onNotify }: { onNotify: (message: string, error?: boolean) => void }) {
  const [rows, setRows] = useState<Notice[]>([]);
  const [editing, setEditing] = useState<Notice | "new" | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi<{ rows: Notice[] }>({ action: "list", resource: "app_takeover_notices", page: 0, pageSize: 100 });
      setRows(data.rows);
    } catch (error) { onNotify(error instanceof Error ? error.message : "Notices unavailable", true); }
    finally { setLoading(false); }
  }, [onNotify]);

  useEffect(() => { void load(); }, [load]);

  return <section className="workspace-panel">
    <header className="section-head"><div><p className="eyebrow">Communication centre</p><h1>Full-screen notices</h1><p>Schedule mandatory maintenance screens or announcements students can dismiss.</p></div><div className="head-actions"><button className="icon-button" onClick={() => void load()} aria-label="Refresh notices">↻</button><button className="button primary" onClick={() => setEditing("new")}>＋ New notice</button></div></header>
    {loading ? <div className="loading-state"><span className="spinner" />Loading notices…</div> : <div className="notice-grid">{rows.map((row) => <article className={`notice-card ${row.is_active ? "live" : ""}`} key={String(row.id)}><div className="notice-card-top"><span className="notice-symbol">{row.is_blocking ? "🔒" : "◉"}</span><div><small>{String(row.notice_kind ?? "general").replaceAll("_", " ")}</small><h3>{String(row.title ?? "Untitled notice")}</h3></div><span className={`status ${row.is_active ? "active" : "inactive"}`}>{row.is_active ? "Active" : "Inactive"}</span></div><p>{String(row.message ?? "")}</p><dl><div><dt>Access</dt><dd>{row.is_blocking ? "Students are blocked" : "Students can continue"}</dd></div><div><dt>Starts</dt><dd>{formatValue(row.starts_at)}</dd></div><div><dt>Ends</dt><dd>{row.ends_at ? formatValue(row.ends_at) : "Until manually disabled"}</dd></div></dl><button className="button ghost" onClick={() => setEditing(row)}>Edit notice</button></article>)}</div>}
    {editing ? <NoticeDrawer row={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); onNotify("Full-screen notice saved."); await load(); }} onNotify={onNotify} /> : null}
  </section>;
}

function NoticeDrawer({ row, onClose, onSaved, onNotify }: { row: Notice | null; onClose: () => void; onSaved: () => void; onNotify: (message: string, error?: boolean) => void }) {
  const [title, setTitle] = useState(String(row?.title ?? ""));
  const [message, setMessage] = useState(String(row?.message ?? ""));
  const [kind, setKind] = useState(String(row?.notice_kind ?? "general"));
  const [blocking, setBlocking] = useState(row?.is_blocking === true);
  const [active, setActive] = useState(row ? row.is_active === true : true);
  const [startsAt, setStartsAt] = useState(localInput(row?.starts_at) || localInput(new Date().toISOString()));
  const [endsAt, setEndsAt] = useState(localInput(row?.ends_at));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim() || !message.trim()) return onNotify("Add a headline and message.", true);
    if (endsAt && new Date(endsAt) <= new Date(startsAt)) return onNotify("The ending time must be after the starting time.", true);
    setSaving(true);
    try {
      await adminApi({
        action: "save",
        resource: "app_takeover_notices",
        identity: row ? { id: row.id } : null,
        values: {
          title: title.trim(), message: message.trim(), notice_kind: kind,
          is_blocking: blocking, is_active: active,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        },
      });
      onSaved();
    } catch (error) { onNotify(error instanceof Error ? error.message : "Notice could not be saved", true); }
    finally { setSaving(false); }
  }

  return <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="record-drawer"><header><div><p className="eyebrow">Student app takeover</p><h2>{row ? "Edit notice" : "Create notice"}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></header><div className="drawer-body">
    <label className="form-field"><span>Notice type</span><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="general">General announcement</option><option value="maintenance">Maintenance</option><option value="emergency">Emergency</option></select></label>
    <label className="form-field"><span>Headline</span><input maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The app is under maintenance" /></label>
    <label className="form-field"><span>Message</span><textarea rows={7} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell students what is happening and when normal access will return." /></label>
    <div className="segmented-field"><span>Can students continue into the app?</span><div><button className={!blocking ? "selected" : ""} onClick={() => setBlocking(false)}>Yes, make it skippable</button><button className={blocking ? "selected danger-choice" : ""} onClick={() => setBlocking(true)}>No, block access</button></div></div>
    <div className="segmented-field"><span>Notice availability</span><div><button className={active ? "selected" : ""} onClick={() => setActive(true)}>Activate</button><button className={!active ? "selected" : ""} onClick={() => setActive(false)}>Keep inactive</button></div></div>
    <div className="form-row"><label className="form-field"><span>Starting date and time</span><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label><label className="form-field"><span>Ending date and time</span><input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /><small>Leave empty to disable it manually.</small></label></div>
    <div className={`notice-preview ${blocking ? "blocking" : ""}`}><small>{blocking ? "OG VIBES SERVICE NOTICE" : "OG VIBES UPDATE"}</small><b>{title || "Your notice headline"}</b><p>{message || "Your message preview will appear here."}</p></div>
  </div><footer><button className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save notice"}</button></footer></aside></div>;
}
