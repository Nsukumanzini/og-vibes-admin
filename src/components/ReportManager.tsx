import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../api";
import type { Resource } from "../types";
import { formatValue } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

type Decision = { row: Record<string, unknown>; kind: "dismiss" | "remove_content" };

export default function ReportManager({ resource, onNotify }: { resource: Resource; onNotify: (message: string, error?: boolean) => void }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<Decision | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi<{ rows: Record<string, unknown>[]; count: number }>({ action: "list", resource: resource.key, page: 0, pageSize: 100 });
      setRows(data.rows);
      setCount(data.count);
    } catch (error) { onNotify(error instanceof Error ? error.message : "Reports unavailable", true); }
    finally { setLoading(false); }
  }, [onNotify, resource.key]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter((row) => ["reporter_name", "author_name", "reason", "details", "content_preview", "reported_item", "status"].some((field) => String(row[field] ?? "").toLowerCase().includes(query)));
  }, [rows, search]);

  async function decide() {
    if (!decision) return;
    try {
      await adminApi({ action: "moderate_report", resource: resource.key, reportId: decision.row.id, decision: decision.kind });
      onNotify(decision.kind === "remove_content" ? "Reported content removed and the case was resolved." : "Report dismissed and audited.");
      setDecision(null);
      await load();
    } catch (error) { onNotify(error instanceof Error ? error.message : "Moderation action failed", true); }
  }

  return <section className="workspace-panel">
    <header className="section-head"><div><p className="eyebrow">Trust & safety</p><h1>{resource.label}</h1><p>{count.toLocaleString()} reports with the people, content and context needed for a fair decision.</p></div><button className="icon-button" onClick={() => void load()} aria-label="Refresh reports">↻</button></header>
    <div className="table-toolbar"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people, reason or content" /></label><span className="security-chip">● Moderation evidence</span></div>
    {loading ? <div className="loading-state"><span className="spinner" />Loading reports…</div> : visible.length === 0 ? <div className="empty-state report-empty"><span>✓</span><h3>No matching reports</h3><p>Your moderation queue is clear.</p></div> : <div className="report-grid">{visible.map((row) => <article className="report-card" key={String(row.id)}>
      <header><div className="report-type"><span>!</span><div><b>{String(row.reported_item ?? resource.label)}</b><small>{formatValue(row.created_at)}</small></div></div><span className={`status ${String(row.status ?? "open")}`}>{String(row.status ?? "open").replaceAll("_", " ")}</span></header>
      <div className="report-people"><Person label="Reported by" name={row.reporter_name} email={row.reporter_email} photo={row.reporter_photo} /><span>→</span><Person label="Content author" name={row.author_name} email={null} photo={row.author_photo} /></div>
      <div className="reported-content">{row.media_url ? <img src={String(row.media_url)} alt="Reported content" /> : null}<div><small>Reported content · {formatValue(row.content_created_at)}</small><p>{String(row.content_preview ?? "Content is unavailable")}</p></div></div>
      <div className="report-reason"><span>Reason for report</span><b>{String(row.reason ?? "Not provided")}</b>{row.details ? <p>{String(row.details)}</p> : null}</div>
      <footer><button className="button ghost" onClick={() => setDecision({ row, kind: "dismiss" })}>Dismiss report</button><button className="button danger" onClick={() => setDecision({ row, kind: "remove_content" })}>Remove reported content</button></footer>
    </article>)}</div>}
    {decision ? <ConfirmDialog title={decision.kind === "remove_content" ? "Remove this reported content?" : "Dismiss this report?"} message={decision.kind === "remove_content" ? "Students will no longer be able to access this post, message, group or listing. The action is recorded in the admin audit log." : "The content will remain available and this report will be marked as dismissed."} confirmLabel={decision.kind === "remove_content" ? "Remove content" : "Dismiss report"} dangerous={decision.kind === "remove_content"} onCancel={() => setDecision(null)} onConfirm={() => void decide()} /> : null}
  </section>;
}

function Person({ label, name, email, photo }: { label: string; name: unknown; email: unknown; photo: unknown }) {
  const displayName = String(name ?? "Unknown user");
  return <div className="report-person">{photo ? <img src={String(photo)} alt="" /> : <span>{displayName.slice(0, 1).toUpperCase()}</span>}<div><small>{label}</small><b>{displayName}</b>{email ? <em>{String(email)}</em> : null}</div></div>;
}
