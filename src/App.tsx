import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi, getSession, signOut } from "./api";
import type { AdminProfile, Resource } from "./types";
import { glyphs } from "./types";
import Communication from "./components/Communication";
import HelpfulContactsManager from "./components/HelpfulContactsManager";
import AdminSecurity from "./components/AdminSecurity";
import AuditLog from "./components/AuditLog";
import Login from "./components/Login";
import NoticeManager from "./components/NoticeManager";
import Overview from "./components/Overview";
import People from "./components/People";
import ReportManager from "./components/ReportManager";
import ResourceManager from "./components/ResourceManager";
import SafetyOperations from "./components/SafetyOperations";
import SystemHealth from "./components/SystemHealth";
import { Toast } from "./components/Toast";

type SessionData = { admin: AdminProfile };
type CatalogData = { resources: Resource[] };

const priorityGroups = ["Overview", "People", "Moderation", "Academics", "Academic content", "Assessments", "Communication", "Community", "Campus", "Marketplace", "Careers", "Safety", "Support", "Operations", "AI Assistant", "System"];
const adminSecurityResource: Resource = { key: "admin_security", label: "Administrator access", group: "System", readOnly: true };
const helpfulContactsResource: Resource = { key: "helpful_contacts", label: "Helpful contacts", group: "Support" };
const systemHealthResource: Resource = { key: "system_health", label: "System health", group: "System", readOnly: true };
const reportResources = new Set(["reports", "chat_reports", "group_reports", "marketplace_reports"]);

export default function App() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [active, setActive] = useState("Overview");
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [authenticating, setAuthenticating] = useState(Boolean(getSession()));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resourceSearch, setResourceSearch] = useState("");
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  const notify = useCallback((message: string, error = false) => {
    setToast({ message, error }); window.setTimeout(() => setToast(null), 4200);
  }, []);

  const authenticate = useCallback(async () => {
    setAuthenticating(true);
    try {
      const [session, catalog] = await Promise.all([
        adminApi<SessionData>({ action: "session" }),
        adminApi<CatalogData>({ action: "catalog" }),
      ]);
      setAdmin(session.admin); setResources([
        ...catalog.resources,
        adminSecurityResource,
        helpfulContactsResource,
        ...(session.admin.access_role === "owner" ? [systemHealthResource] : []),
      ]);
    } catch (error) {
      setAdmin(null);
      if (getSession()) notify(error instanceof Error ? error.message : "Administrator verification failed", true);
    } finally { setAuthenticating(false); }
  }, [notify]);

  useEffect(() => { if (getSession()) void authenticate(); }, [authenticate]);

  const groups = useMemo(() => {
    const available = new Set(resources.map((resource) => resource.group));
    return priorityGroups.filter((group) => group === "Overview" || group === "People" || group === "Communication" || available.has(group));
  }, [resources]);
  const activeResource = resources.find((resource) => resource.key === active);
  const pageLabel = activeResource?.label ?? active;
  const matches = resourceSearch.trim() ? resources.filter((resource) => `${resource.label} ${resource.group}`.toLowerCase().includes(resourceSearch.toLowerCase())).slice(0, 8) : [];

  function navigate(value: string) { if (value !== active) setNavigationHistory((history) => [...history, active]); setActive(value); setSidebarOpen(false); setResourceSearch(""); }
  function goBack() { setActive(navigationHistory.at(-1) ?? "Overview"); setNavigationHistory((history) => history.slice(0, -1)); setSidebarOpen(false); setResourceSearch(""); }
  async function logout() { await signOut(); setAdmin(null); setResources([]); setActive("Overview"); setNavigationHistory([]); }

  if (authenticating) return <div className="app-loader"><span className="brand-mark">OG</span><div className="spinner" /><p>Verifying secure administrator access…</p></div>;
  if (!admin) return <Login onSuccess={() => void authenticate()} />;

  return <div className="admin-shell">
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="sidebar-brand"><span className="brand-mark">OG</span><span><b>OG VIBES</b><small>ADMIN CONTROL</small></span><button onClick={() => setSidebarOpen(false)}>×</button></div>
      <nav aria-label="Administrator modules">{groups.map((group) => <button key={group} className={active === group || activeResource?.group === group ? "active" : ""} onClick={() => navigate(group)}><span>{glyphs[group] ?? "◇"}</span>{group}<b>›</b></button>)}</nav>
      <div className="sidebar-footer"><div className="admin-mini"><span>{(admin.nickname || admin.email).slice(0, 1).toUpperCase()}</span><div><b>{admin.nickname || "Administrator"}</b><small>{admin.email}</small><em>{admin.access_label}</em></div></div><button className="logout" onClick={() => void logout()}>↪ Sign out</button></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="button ghost" onClick={goBack} disabled={active === "Overview" && navigationHistory.length === 0} aria-label="Go back">← Back</button><button className="menu-button" onClick={() => setSidebarOpen(true)}>☰</button><div className="breadcrumb"><span>Admin control</span><b>/</b><strong>{pageLabel}</strong></div><div className="global-search"><span>⌕</span><input value={resourceSearch} onChange={(event) => setResourceSearch(event.target.value)} placeholder="Find a management area…" />{matches.length > 0 && <div className="search-results">{matches.map((resource) => <button key={resource.key} onClick={() => navigate(resource.key)}><span>{glyphs[resource.group] ?? "◇"}</span><div><b>{resource.label}</b><small>{resource.group}</small></div></button>)}</div>}</div><div className="top-status"><span>●</span> Secure</div></header>
      <div className="content-area">
        {active === "Overview" ? <Overview navigate={navigate} onNotify={notify} /> : active === "People" ? <People openProfiles={() => navigate("profiles")} onNotify={notify} /> : active === "Communication" ? <Communication openNotices={() => navigate("app_takeover_notices")} openNotifications={() => navigate("student_notifications")} onNotify={notify} /> : active === "system_health" ? <SystemHealth onNotify={notify} /> : active === "admin_security" ? <AdminSecurity currentAdmin={admin} onNotify={notify} /> : active === "admin_audit_logs" ? <AuditLog canExport={admin.can_export_audit} onNotify={notify} /> : active === "app_takeover_notices" ? <NoticeManager onNotify={notify} /> : active === "helpful_contacts" ? <HelpfulContactsManager onNotify={notify} /> : active === "sos_incidents" ? <SafetyOperations onNotify={notify} /> : activeResource && reportResources.has(activeResource.key) ? <ReportManager resource={activeResource} onNotify={notify} /> : activeResource ? <ResourceManager resource={activeResource} onNotify={notify} /> : <ResourceDirectory group={active} resources={resources.filter((resource) => resource.group === active)} navigate={navigate} />}
      </div>
    </main>
    {toast && <Toast message={toast.message} tone={toast.error ? "error" : "success"} onClose={() => setToast(null)} />}
  </div>;
}

function ResourceDirectory({ group, resources, navigate }: { group: string; resources: Resource[]; navigate: (value: string) => void }) {
  const descriptions: Record<string, string> = {
    Moderation: "Review reports, harmful content and community safety signals.", Academics: "Control programmes, modules, lecturer assignments and registrations.",
    "Academic content": "Publish and maintain the learning material students receive.", Assessments: "Manage briefs, submissions, quizzes, marks and academic integrity.",
    Community: "Oversee the social feed, groups and student connections.", Campus: "Coordinate events, lost-and-found and physical campus activity.",
    Marketplace: "Moderate listings, orders and buyer or seller reports.", Careers: "Publish opportunities and manage applications and resources.",
    Safety: "Respond to SOS incidents and manage trusted campus responders.", Support: "Resolve student requests, suggestions, bugs and assistance.",
    Operations: "Inspect delivery, usage, call and messaging telemetry safely.", "AI Assistant": "Approve and monitor the academic material used by OG Assistant.",
    System: "Inspect immutable administrator actions and platform controls.",
  };
  return <section className="directory"><header className="directory-hero"><span>{glyphs[group] ?? "◇"}</span><div><p className="eyebrow">Management domain</p><h1>{group}</h1><p>{descriptions[group] ?? "Manage live OG Vibes records securely."}</p></div></header><div className="resource-grid">{resources.map((resource) => <button key={resource.key} onClick={() => navigate(resource.key)}><span>{resource.readOnly ? "◌" : resource.create ? "+" : "◇"}</span><div><h3>{resource.label}</h3><p>{resource.readOnly ? "Protected monitoring view" : resource.create ? "Create, update and review" : "Review and manage records"}</p></div><b>→</b></button>)}</div></section>;
}
