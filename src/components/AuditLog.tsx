import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../api";
import { formatValue, titleCase } from "../types";

type AuditRow = {
  id: number;
  actor_name?: string;
  actor_email?: string;
  actor_role?: string;
  action: string;
  resource: string;
  category?: string;
  outcome: "success" | "failed" | "denied";
  target_label?: string;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  changed_fields?: string[];
  error_message?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  created_at: string;
};

type AdminRow = { email?: string; nickname?: string; actor_name?: string };
type Filters = { actorEmail: string; category: string; outcome: string; dateFrom: string; dateTo: string; target: string };

const emptyFilters: Filters = { actorEmail: "", category: "", outcome: "", dateFrom: "", dateTo: "", target: "" };

export default function AuditLog({ canExport, onNotify }: { canExport: boolean; onNotify: (message: string, error?: boolean) => void }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  const requestFilters = useMemo(() => ({
    actorEmail: applied.actorEmail || undefined,
    category: applied.category || undefined,
    outcome: applied.outcome || undefined,
    dateFrom: applied.dateFrom ? new Date(`${applied.dateFrom}T00:00:00`).toISOString() : undefined,
    dateTo: applied.dateTo ? new Date(`${applied.dateTo}T23:59:59.999`).toISOString() : undefined,
    target: applied.target.trim() || undefined,
  }), [applied]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi<{ rows: AuditRow[]; count: number }>({ action: "audit_log", page, pageSize, filters: requestFilters });
      setRows(data.rows); setCount(data.count);
    } catch (error) { onNotify(error instanceof Error ? error.message : "Audit activity is unavailable", true); }
    finally { setLoading(false); }
  }, [onNotify, page, requestFilters]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void adminApi<{ admins: AdminRow[] }>({ action: "admin_activity" })
      .then((data) => setAdmins(data.admins))
      .catch(() => undefined);
  }, []);

  function applyFilters() { setPage(0); setApplied(filters); }
  function clearFilters() { setFilters(emptyFilters); setApplied(emptyFilters); setPage(0); }

  async function exportAudit() {
    try {
      const data = await adminApi<{ rows: AuditRow[] }>({ action: "audit_export", filters: requestFilters });
      const headings = ["Date", "Administrator", "Email", "Role", "Category", "Action", "Target", "Outcome", "Error", "Request ID"];
      const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const lines = [headings, ...data.rows.map((row) => [row.created_at, row.actor_name, row.actor_email, row.actor_role, row.category, row.action, row.target_label, row.outcome, row.error_message, row.request_id])]
        .map((line) => line.map(quote).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([lines], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `og-vibes-admin-audit-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
      onNotify("Protected audit export downloaded.");
    } catch (error) { onNotify(error instanceof Error ? error.message : "Audit export failed", true); }
  }

  return <section className="workspace-panel audit-workspace">
    <header className="section-head"><div><p className="eyebrow">System accountability</p><h1>Administrator audit log</h1><p>See who changed what, which record was affected and whether the action succeeded.</p></div><div className="head-actions"><button className="icon-button" onClick={() => void load()} aria-label="Refresh audit log">↻</button>{canExport ? <button className="button primary" onClick={() => void exportAudit()}>Export audit CSV</button> : null}</div></header>
    <div className="audit-filters" aria-label="Audit filters">
      <label><span>Administrator</span><select value={filters.actorEmail} onChange={(event) => setFilters({ ...filters, actorEmail: event.target.value })}><option value="">Everyone</option>{admins.filter((admin) => admin.email).map((admin) => <option key={admin.email} value={admin.email}>{admin.nickname || admin.actor_name || admin.email} · {admin.email}</option>)}</select></label>
      <label><span>Category</span><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All areas</option>{["People", "Moderation", "Academics", "Academic content", "Assessments", "Communication", "Community", "Campus", "Marketplace", "Careers", "Safety", "Support", "Operations", "System", "Security"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Outcome</span><select value={filters.outcome} onChange={(event) => setFilters({ ...filters, outcome: event.target.value })}><option value="">Every result</option><option value="success">Successful</option><option value="failed">Failed</option><option value="denied">Denied</option></select></label>
      <label><span>From</span><input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} /></label>
      <label><span>To</span><input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} /></label>
      <label className="audit-target"><span>Affected person or content</span><input value={filters.target} onChange={(event) => setFilters({ ...filters, target: event.target.value })} placeholder="Search visible name" /></label>
      <div className="audit-filter-actions"><button className="button primary" onClick={applyFilters}>Apply filters</button><button className="button ghost" onClick={clearFilters}>Clear</button></div>
    </div>
    <div className="data-card">
      {loading ? <div className="loading-state"><span className="spinner" />Loading administrator activity…</div> : rows.length === 0 ? <div className="empty-state"><span>✓</span><h3>No matching activity</h3><p>Change the filters to inspect another period.</p></div> : <div className="table-scroll"><table><thead><tr><th>Administrator</th><th>Category</th><th>Action</th><th>Affected record</th><th>Result</th><th>Date and time</th><th>Details</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><div className="audit-actor"><span>{(row.actor_name || row.actor_email || "A").slice(0, 1).toUpperCase()}</span><div><b>{row.actor_name || "Administrator"}</b><small>{row.actor_email || "Email unavailable"} · {friendlyRole(row.actor_role)}</small></div></div></td><td>{row.category || titleCase(row.resource)}</td><td>{titleCase(row.action)}</td><td>{row.target_label || "—"}</td><td><span className={`status audit-${row.outcome}`}>{friendlyOutcome(row.outcome)}</span></td><td>{formatValue(row.created_at)}</td><td><button className="table-detail-button" onClick={() => setSelected(row)}>View change</button></td></tr>)}</tbody></table></div>}
      <footer className="pagination"><span>{count.toLocaleString()} audited action{count === 1 ? "" : "s"}</span><div><button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button><button disabled={(page + 1) * pageSize >= count} onClick={() => setPage((value) => value + 1)}>Next</button></div></footer>
    </div>
    {selected ? <AuditDrawer row={selected} onClose={() => setSelected(null)} /> : null}
  </section>;
}

function AuditDrawer({ row, onClose }: { row: AuditRow; onClose: () => void }) {
  const changed = row.changed_fields ?? [];
  return <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="record-drawer audit-drawer" aria-label="Audit details"><header><div><p className="eyebrow">Verified activity</p><h2>{titleCase(row.action)}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close audit details">×</button></header><div className="drawer-body">
    <div className="audit-summary"><span>{(row.actor_name || "A").slice(0, 1).toUpperCase()}</span><div><b>{row.actor_name || "Administrator"}</b><p>{row.actor_email || "Email unavailable"} · {friendlyRole(row.actor_role)}</p></div><em className={`status audit-${row.outcome}`}>{friendlyOutcome(row.outcome)}</em></div>
    <dl className="readable-record"><div><dt>Affected record</dt><dd>{row.target_label || "Not supplied"}</dd></div><div><dt>Category</dt><dd>{row.category || titleCase(row.resource)}</dd></div><div><dt>Date and time</dt><dd>{formatValue(row.created_at)}</dd></div><div><dt>Network address</dt><dd>{row.ip_address || "Unavailable"}</dd></div><div><dt>Request reference</dt><dd>{row.request_id || "Unavailable"}</dd></div>{row.error_message ? <div><dt>Reason</dt><dd>{row.error_message}</dd></div> : null}</dl>
    <section className="change-list"><h3>{changed.length ? "Changes made" : "Recorded details"}</h3>{changed.length ? changed.map((field) => <article key={field}><b>{titleCase(field)}</b><div><span>Before</span><p>{formatValue(row.before_data?.[field])}</p></div><div><span>After</span><p>{formatValue(row.after_data?.[field])}</p></div></article>) : <pre>{JSON.stringify(row.details ?? {}, null, 2)}</pre>}</section>
  </div><footer><button className="button primary" onClick={onClose}>Done</button></footer></aside></div>;
}

function friendlyOutcome(outcome: AuditRow["outcome"]) { return outcome === "success" ? "Successful" : outcome === "denied" ? "Denied" : "Failed"; }
function friendlyRole(role?: string) { return role === "owner" ? "Owner" : role === "vice_admin" ? "Vice Admin" : titleCase(role || "Administrator"); }
