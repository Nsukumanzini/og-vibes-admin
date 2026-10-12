import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../api";
import { ConfirmDialog } from "./ConfirmDialog";

type ContactRow = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  data?: {
    action?: "phone" | "email" | "web";
    value?: string;
    display_value?: string;
    category?: string;
  };
  sort_order?: number;
  is_active?: boolean;
};

type ContactDraft = {
  title: string;
  subtitle: string;
  action: "phone" | "email" | "web";
  value: string;
  displayValue: string;
  category: string;
  active: boolean;
};

const emptyDraft: ContactDraft = {
  title: "",
  subtitle: "",
  action: "phone",
  value: "",
  displayValue: "",
  category: "General",
  active: true,
};

export default function HelpfulContactsManager({ onNotify }: { onNotify: (message: string, error?: boolean) => void }) {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [removing, setRemoving] = useState<ContactRow | null>(null);
  const [draft, setDraft] = useState<ContactDraft>(emptyDraft);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi<{ rows: ContactRow[] }>({
        action: "list",
        resource: "app_content",
        page: 0,
        pageSize: 100,
        filters: { section: "helpful_contacts" },
      });
      setRows(response.rows.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)));
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Helpful contacts could not be loaded", true);
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => { void load(); }, [load]);

  function startNew() {
    setEditing(null);
    setDraft(emptyDraft);
  }

  function startEdit(row: ContactRow) {
    setEditing(row);
    setDraft({
      title: row.title ?? "",
      subtitle: row.subtitle ?? "",
      action: row.data?.action ?? "web",
      value: row.data?.value ?? "",
      displayValue: row.data?.display_value ?? row.data?.value ?? "",
      category: row.data?.category ?? "General",
      active: row.is_active !== false,
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.value.trim()) {
      onNotify("Add a contact name and contact detail before saving.", true);
      return;
    }
    setSaving(true);
    try {
      const slug = editing?.slug || `${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;
      await adminApi({
        action: "save",
        resource: "app_content",
        identity: editing ? { id: editing.id } : undefined,
        values: {
          section: "helpful_contacts",
          slug,
          title: draft.title.trim(),
          subtitle: draft.subtitle.trim(),
          data: {
            action: draft.action,
            value: draft.value.trim(),
            display_value: draft.displayValue.trim() || draft.value.trim(),
            category: draft.category,
          },
          sort_order: editing?.sort_order ?? rows.length + 1,
          is_active: draft.active,
        },
      });
      onNotify(editing ? "Contact updated." : "Contact added to the student app.");
      startNew();
      await load();
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Contact could not be saved", true);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!removing) return;
    try {
      await adminApi({ action: "remove", resource: "app_content", identity: { id: removing.id } });
      onNotify("Contact removed.");
      setRemoving(null);
      if (editing?.id === removing.id) startNew();
      await load();
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Contact could not be removed", true);
    }
  }

  const valueLabel = draft.action === "phone" ? "Phone number" : draft.action === "email" ? "Email address" : "Website address";

  return <section className="workspace-panel contacts-manager">
    <header className="section-head"><div><p className="eyebrow">Student directory</p><h1>Helpful contacts</h1><p>Manage the phone numbers, email addresses and websites students can open directly from the app.</p></div><button className="button ghost" onClick={() => void load()}>Refresh</button></header>
    <div className="contacts-layout">
      <form className="contact-editor" onSubmit={save}>
        <div className="compose-head"><span>＋</span><div><h2>{editing ? "Edit contact" : "Add a contact"}</h2><p>Students will see these details exactly as entered.</p></div></div>
        <label className="form-field"><span>Contact name</span><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Student Support Services" /></label>
        <label className="form-field"><span>Short description</span><textarea rows={3} value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} placeholder="Explain when students should use this contact." /></label>
        <div className="form-row"><label className="form-field"><span>Contact type</span><select value={draft.action} onChange={(event) => setDraft({ ...draft, action: event.target.value as ContactDraft["action"] })}><option value="phone">Phone call</option><option value="email">Email</option><option value="web">Website</option></select></label><label className="form-field"><span>Category</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option>General</option><option>Academic</option><option>Financial aid</option><option>Wellbeing</option><option>Emergency</option></select></label></div>
        <label className="form-field"><span>{valueLabel}</span><input required type={draft.action === "email" ? "email" : draft.action === "web" ? "url" : "tel"} value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} placeholder={draft.action === "phone" ? "+27 17 811 5824" : draft.action === "email" ? "support@example.co.za" : "https://example.co.za"} /></label>
        <label className="form-field"><span>Display text</span><input value={draft.displayValue} onChange={(event) => setDraft({ ...draft, displayValue: event.target.value })} placeholder="Optional friendly version shown to students" /></label>
        <label className="contact-toggle"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /><span><b>Available to students</b><small>Turn this off to hide the contact without deleting it.</small></span></label>
        <div className="head-actions"><button className="button primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add contact"}</button>{editing && <button type="button" className="button ghost" onClick={startNew}>Cancel editing</button>}</div>
      </form>
      <div className="contact-list"><header><div><h2>Current contacts</h2><p>{rows.length} contact{rows.length === 1 ? "" : "s"}</p></div></header>{loading ? <div className="loading-state"><span className="spinner" />Loading contacts…</div> : rows.length === 0 ? <div className="empty-mini">No helpful contacts have been added yet.</div> : rows.map((row) => <article key={row.id} className={!row.is_active ? "inactive" : ""}><span>{row.data?.action === "phone" ? "☎" : row.data?.action === "email" ? "✉" : "↗"}</span><div><b>{row.title}</b><p>{row.subtitle || "No description"}</p><small>{row.data?.display_value || row.data?.value}</small></div><em>{row.is_active ? "Visible" : "Hidden"}</em><div className="row-actions"><button onClick={() => startEdit(row)}>Edit</button><button className="delete-link" onClick={() => setRemoving(row)}>Remove</button></div></article>)}</div>
    </div>
    {removing && <ConfirmDialog title="Remove this contact?" message={`${removing.title} will disappear from the student app.`} dangerous confirmLabel="Remove contact" onCancel={() => setRemoving(null)} onConfirm={() => void remove()} />}
  </section>;
}
