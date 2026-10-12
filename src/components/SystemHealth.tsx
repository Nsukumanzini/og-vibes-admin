import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../api";

type HealthData = {
  windowDays: number;
  generatedAt: string;
  email: { sent: number; delivered: number; opened: number; bounced: number; spam: number; deliveryRate: number | null; recentFailures: Record<string, unknown>[] };
  notifications: { delivered: number; failed: number; invalidTokens: number; unopened: number; successRate: number | null };
  activeUsers: number;
  failedUploads: number;
  edgeFunctionFailures: number;
  recentUploadFailures: Record<string, unknown>[];
  recentEdgeFailures: Record<string, unknown>[];
  storage: { bucket_id: string; object_count: number; bytes_used: number; latest_upload_at?: string }[];
  featureFlags: { feature_key: string; display_name: string; description: string; enabled: boolean; disabled_message: string; updated_at: string }[];
};

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** unit).toFixed(unit > 1 ? 1 : 0)} ${units[unit]}`;
};

const metric = (label: string, value: string | number, note: string, tone = "blue") => (
  <article className={`health-metric ${tone}`}><span>{value}</span><div><b>{label}</b><small>{note}</small></div></article>
);

export default function SystemHealth({ onNotify }: { onNotify: (message: string, error?: boolean) => void }) {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await adminApi<HealthData>({ action: "system_health" })); }
    catch (error) { onNotify(error instanceof Error ? error.message : "System health is unavailable", true); }
    finally { setLoading(false); }
  }, [onNotify]);

  useEffect(() => { void load(); }, [load]);

  const storageTotal = useMemo(() => data?.storage.reduce((total, bucket) => total + Number(bucket.bytes_used || 0), 0) ?? 0, [data?.storage]);

  async function toggleFeature(feature: HealthData["featureFlags"][number]) {
    const enabled = !feature.enabled;
    if (!enabled && !window.confirm(`Temporarily disable ${feature.display_name}? Students will immediately see the maintenance message.`)) return;
    setChanging(feature.feature_key);
    try {
      await adminApi({ action: "set_feature_flag", featureKey: feature.feature_key, enabled });
      onNotify(`${feature.display_name} ${enabled ? "enabled" : "disabled"}.`);
      await load();
    } catch (error) { onNotify(error instanceof Error ? error.message : "Feature control failed", true); }
    finally { setChanging(null); }
  }

  return <section className="system-health">
    <header className="health-hero"><div><p className="eyebrow cyan">OWNER OPERATIONS</p><h1>System health</h1><p>Live delivery, activity, storage and reliability signals for the OG Vibes ecosystem.</p></div><button className="button light" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh health"}</button></header>

    <div className="health-section-head"><div><h2>Last {data?.windowDays ?? 7} days</h2><p>Push “delivered” means Firebase accepted the device request. Unopened means the student has not opened it inside OG Vibes.</p></div><small>{data?.generatedAt ? `Updated ${new Date(data.generatedAt).toLocaleString()}` : "Loading live data…"}</small></div>
    <div className="health-metrics-grid">
      {metric("Active users", loading ? "—" : data?.activeUsers ?? 0, "Devices active in the last 24 hours", "green")}
      {metric("Failed uploads", loading ? "—" : data?.failedUploads ?? 0, "Recorded app upload failures", (data?.failedUploads ?? 0) > 0 ? "red" : "green")}
      {metric("Edge failures", loading ? "—" : data?.edgeFunctionFailures ?? 0, "Instrumented function failures", (data?.edgeFunctionFailures ?? 0) > 0 ? "red" : "green")}
      {metric("Storage used", loading ? "—" : formatBytes(storageTotal), `${data?.storage.reduce((total, item) => total + Number(item.object_count || 0), 0) ?? 0} stored files`, "cyan")}
    </div>

    <div className="health-two-column">
      <article className="health-panel"><header><div><h2>Push notifications</h2><p>Per-device delivery outcomes</p></div><strong>{data?.notifications.successRate == null ? "—" : `${data.notifications.successRate}%`}<small>accepted</small></strong></header><div className="health-stat-grid"><span><b>{data?.notifications.delivered ?? 0}</b>Delivered</span><span><b>{data?.notifications.failed ?? 0}</b>Failed</span><span><b>{data?.notifications.invalidTokens ?? 0}</b>Invalid tokens</span><span><b>{data?.notifications.unopened ?? 0}</b>Unopened</span></div><p className="health-note">Invalid device tokens are removed automatically after Firebase rejects them permanently.</p></article>
      <article className="health-panel"><header><div><h2>Email delivery</h2><p>Brevo transactional events</p></div><strong>{data?.email.deliveryRate == null ? "—" : `${data.email.deliveryRate}%`}<small>delivery rate</small></strong></header><div className="health-stat-grid"><span><b>{data?.email.sent ?? 0}</b>Sent</span><span><b>{data?.email.delivered ?? 0}</b>Delivered</span><span><b>{data?.email.bounced ?? 0}</b>Bounced/blocked</span><span><b>{data?.email.spam ?? 0}</b>Spam reports</span></div><p className="health-note">Opened: {data?.email.opened ?? 0}. Delivery data begins after the Brevo webhook is enabled.</p></article>
    </div>

    <article className="health-panel feature-controls"><header><div><h2>Feature controls</h2><p>Pause unstable services without publishing a new app release.</p></div><span className="owner-only-chip">Owner only</span></header><div className="feature-list">{data?.featureFlags.map((feature) => <div key={feature.feature_key}><span className={`feature-state ${feature.enabled ? "on" : "off"}`}>{feature.enabled ? "Available" : "Paused"}</span><div><b>{feature.display_name}</b><p>{feature.description}</p><small>{feature.enabled ? "Students can use this feature." : feature.disabled_message}</small></div><button role="switch" aria-checked={feature.enabled} aria-label={`${feature.enabled ? "Disable" : "Enable"} ${feature.display_name}`} className={`feature-switch ${feature.enabled ? "on" : ""}`} disabled={changing === feature.feature_key} onClick={() => void toggleFeature(feature)}><span /></button></div>)}</div></article>

    <div className="health-two-column">
      <article className="health-panel health-list"><header><div><h2>Recent function failures</h2><p>Sanitised operational errors</p></div></header>{data?.recentEdgeFailures.length ? <ul>{data.recentEdgeFailures.slice(0, 8).map((row, index) => <li key={`${String(row.source)}-${String(row.occurred_at)}-${index}`}><span>!</span><div><b>{String(row.source ?? "Edge Function")}</b><p>{String(row.message ?? row.event_type ?? "Request failed")}</p><small>{new Date(String(row.occurred_at)).toLocaleString()}</small></div></li>)}</ul> : <div className="empty-mini positive">✓ No instrumented Edge Function failures in this period.</div>}</article>
      <article className="health-panel health-list"><header><div><h2>Storage by area</h2><p>Database-backed Storage inventory</p></div></header>{data?.storage.length ? <ul>{data.storage.map((bucket) => <li key={bucket.bucket_id}><span>▣</span><div><b>{bucket.bucket_id}</b><p>{Number(bucket.object_count).toLocaleString()} files</p><small>{formatBytes(Number(bucket.bytes_used))}</small></div></li>)}</ul> : <div className="empty-mini">No Storage usage data available.</div>}</article>
    </div>

    <div className="health-two-column">
      <article className="health-panel health-list"><header><div><h2>Recent email problems</h2><p>Bounces, blocks, invalid addresses and spam reports</p></div></header>{data?.email.recentFailures.length ? <ul>{data.email.recentFailures.slice(0, 8).map((row, index) => <li key={`${String(row.recipient_email)}-${String(row.occurred_at)}-${index}`}><span>!</span><div><b>{String(row.event_type ?? "Delivery problem").replaceAll("_", " ")}</b><p>{String(row.recipient_email ?? row.subject ?? "Recipient unavailable")}</p><small>{String(row.reason ?? "No provider reason supplied")} · {new Date(String(row.occurred_at)).toLocaleString()}</small></div></li>)}</ul> : <div className="empty-mini positive">✓ No Brevo delivery problems recorded in this period.</div>}</article>
      <article className="health-panel health-list"><header><div><h2>Recent upload failures</h2><p>Files that did not reach Storage</p></div></header>{data?.recentUploadFailures.length ? <ul>{data.recentUploadFailures.slice(0, 8).map((row, index) => <li key={`${String(row.source ?? row.platform)}-${String(row.occurred_at ?? row.created_at)}-${index}`}><span>!</span><div><b>{String(row.source ?? row.platform ?? "App upload")}</b><p>{String(row.message ?? row.event ?? "Upload failed")}</p><small>{new Date(String(row.occurred_at ?? row.created_at)).toLocaleString()}</small></div></li>)}</ul> : <div className="empty-mini positive">✓ No upload failures recorded in this period.</div>}</article>
    </div>
  </section>;
}
