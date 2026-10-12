import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi, uploadAdminFile } from "../api";
import {
  booleanCopy, displayFieldLabel, hiddenEditorFields, isDateField, isDateTimeField,
  isLongField, lookupLabel, numberFields, optionsFor, relationLookups,
  requiredFieldsByResource, resourceColumns, uploadDefinitions,
} from "../resourceUi";
import type { LookupCatalog, Resource } from "../types";
import { formatValue } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = { resource: Resource; onNotify: (message: string, error?: boolean) => void };

const systemColumns = new Set([
  "id", "token_hash", "storage_path", "image_paths", "image_urls", "attachment_storage_path", "attachment_mime_type",
  "attachment_file_size_bytes", "created_by", "updated_at", "metadata", "dedupe_key",
]);

function inputValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function localDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return new Date(date.valueOf() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function initialValue(field: string, value: unknown, resourceKey: string) {
  if (field === "requirements" && Array.isArray(value)) return value.join("\n");
  if (value != null) return isDateTimeField(field) ? localDateTime(String(value)) : inputValue(value);
  if (field === "is_active") return "true";
  if (["published", "is_published", "is_verified", "allow_late", "is_negotiable", "is_remote", "nsfas_accredited", "verified_landlord"].includes(field)) return "false";
  if (["secure_mode", "randomize_questions", "randomize_options"].includes(field)) return "true";
  return optionsFor(resourceKey, field, {})[0]?.value ?? "";
}

function parseValue(field: string, value: string, original: unknown) {
  if (field === "requirements" && Array.isArray(original)) return value.split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean);
  if (field === "amenities") return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  if (booleanCopy[field] || typeof original === "boolean") return value === "true";
  if (numberFields.has(field) || typeof original === "number") return value === "" ? null : Number(value);
  if (isDateTimeField(field)) return value ? new Date(value).toISOString() : null;
  if (isDateField(field)) return value || null;
  if (typeof original === "object" && original != null) return value ? JSON.parse(value) : null;
  if (relationLookups[field]) return value || null;
  return value.trim() === "" ? null : value.trim();
}

function displayValue(resourceKey: string, field: string, value: unknown, lookups: LookupCatalog) {
  if (value == null || value === "") return "—";
  if (field === "requested_module_ids" && Array.isArray(value)) {
    const moduleLabels = new Map((lookups.modules ?? []).map((item) => [item.value, item.label]));
    return value.length ? value.map((id) => moduleLabels.get(String(id)) ?? "Unavailable module").join(", ") : "No modules selected";
  }
  const related = lookupLabel(field, value, lookups);
  if (related) return related;
  if (typeof value === "boolean") return (booleanCopy[field] ?? ["Enabled", "Disabled"])[value ? 0 : 1];
  const option = optionsFor(resourceKey, field, lookups).find((item) => item.value === String(value));
  return option?.label ?? formatValue(value);
}

function cellTone(field: string, value: unknown) {
  if (typeof value === "boolean") return value ? "active" : "inactive";
  return ["status", "role", "account_status"].includes(field) ? String(value ?? "").toLowerCase() : "";
}

export default function ResourceManager({ resource, onNotify }: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [lookups, setLookups] = useState<LookupCatalog>({});
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, unknown> | "new" | null>(null);
  const [deleting, setDeleting] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [records, lookupData] = await Promise.all([
        adminApi<{ rows: Record<string, unknown>[]; count: number }>({ action: "list", resource: resource.key, page, pageSize: 25 }),
        adminApi<{ lookups: LookupCatalog }>({ action: "lookups" }),
      ]);
      setRows(records.rows);
      setCount(records.count);
      setLookups(lookupData.lookups);
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Unable to load records", true);
    } finally { setLoading(false); }
  }, [resource.key, page, onNotify]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(0); setSearch(""); setEditing(null); }, [resource.key]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => Object.entries(row).some(([field, value]) => displayValue(resource.key, field, value, lookups).toLowerCase().includes(query)));
  }, [lookups, resource.key, rows, search]);

  const columns = useMemo(() => {
    const configured = resourceColumns[resource.key];
    if (configured) return configured.filter((field) => rows.some((row) => field in row));
    const preferred = ["nickname", "title", "name", "email", "status", "category", "campus", "role", "created_at"];
    const found = new Set(rows.flatMap((row) => Object.keys(row)));
    return [...preferred.filter((key) => found.has(key)), ...[...found].filter((key) => !preferred.includes(key) && !systemColumns.has(key) && !key.endsWith("_id"))].slice(0, 6);
  }, [resource.key, rows]);

  const identity = (row: Record<string, unknown>) => Object.fromEntries((resource.primaryKey ?? ["id"]).map((key) => [key, row[key]]));

  async function remove() {
    if (!deleting) return;
    try {
      await adminApi({ action: "remove", resource: resource.key, identity: identity(deleting) });
      onNotify(`${resource.label} record removed.`);
      setDeleting(null);
      await load();
    } catch (error) { onNotify(error instanceof Error ? error.message : "Delete failed", true); }
  }

  return <section className="workspace-panel">
    <header className="section-head"><div><p className="eyebrow">{resource.group}</p><h1>{resource.label}</h1><p>{count.toLocaleString()} records · friendly names and controls replace technical identifiers</p></div><div className="head-actions"><button className="icon-button" onClick={() => void load()} aria-label={`Refresh ${resource.label}`}>↻</button>{resource.create ? <button className="button primary" onClick={() => setEditing("new")}>＋ Add record</button> : null}</div></header>
    <div className="table-toolbar"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${resource.label.toLowerCase()}`} /></label><span className="security-chip">● Live database</span></div>
    <div className="data-card">
      {loading ? <div className="loading-state"><span className="spinner" />Loading records…</div> : visible.length === 0 ? <div className="empty-state"><span>◇</span><h3>No records found</h3><p>Try another search or create the first record.</p></div> : <div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column}>{displayFieldLabel(column)}</th>)}<th>Actions</th></tr></thead><tbody>{visible.map((row, index) => <tr key={String(row.id ?? index)}>{columns.map((column) => { const value = row[column]; const tone = cellTone(column, value); return <td key={column}><span className={tone ? `status ${tone}` : "cell-value"}>{displayValue(resource.key, column, value, lookups)}</span></td>; })}<td><div className="row-actions">{!resource.readOnly && (resource.editable?.length ?? 0) > 0 ? <button onClick={() => setEditing(row)}>Edit</button> : null}{resource.delete ? <button className="delete-link" onClick={() => setDeleting(row)}>Delete</button> : null}<button onClick={() => setEditing(row)}>View</button></div></td></tr>)}</tbody></table></div>}
      <footer className="pagination"><span>Page {page + 1} of {Math.max(1, Math.ceil(count / 25))}</span><div><button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button><button disabled={(page + 1) * 25 >= count} onClick={() => setPage((value) => value + 1)}>Next</button></div></footer>
    </div>
    {editing ? <RecordDrawer resource={resource} row={editing === "new" ? null : editing} identity={editing === "new" ? null : identity(editing)} lookups={lookups} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); onNotify("Changes saved and audited."); await load(); }} onNotify={onNotify} /> : null}
    {deleting ? <ConfirmDialog title={`Delete this ${resource.label.toLowerCase()} record?`} message="This action is permanent and will be written to the administrator audit log." confirmLabel="Delete record" dangerous onCancel={() => setDeleting(null)} onConfirm={() => void remove()} /> : null}
  </section>;
}

function RecordDrawer({ resource, row, identity, lookups, onClose, onSaved, onNotify }: { resource: Resource; row: Record<string, unknown> | null; identity: Record<string, unknown> | null; lookups: LookupCatalog; onClose: () => void; onSaved: () => void; onNotify: (message: string, error?: boolean) => void }) {
  const academicDocument = ["past_papers", "lecture_slides", "timetables"].includes(resource.key);
  const editorFields = (resource.editable ?? []).filter((field) => !hiddenEditorFields.has(field)
    && !(academicDocument && ["subject", "level", "programme", "module", "created_by"].includes(field))
    && !(resource.key === "past_papers" && field === "title")
    && !(resource.key === "accommodations" && ["nsfas_accreditation_expires_on", "amenities", "available_spaces"].includes(field))
    && !(resource.key === "career_opportunities" && !["title", "description", "category", "company", "application_url", "closing_at", "requirements"].includes(field)));
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(editorFields.map((field) => [field, initialValue(field, row?.[field] ?? (academicDocument && field === "year" ? new Date().getFullYear() : undefined), resource.key)])));
  const visibleFields = editorFields.filter((field) => !(resource.key === "accommodations" && field === "monthly_price" && values.nsfas_accredited === "true"));
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [keptAccommodationImages, setKeptAccommodationImages] = useState<string[]>(() => {
    if (resource.key !== "accommodations") return [];
    const urls = Array.isArray(row?.image_urls) ? row.image_urls.map(String) : [];
    const legacy = String(row?.image_url ?? "").trim();
    return [...new Set([...urls, ...(legacy ? [legacy] : [])])];
  });
  const [saving, setSaving] = useState(false);
  const readonly = resource.readOnly || visibleFields.length === 0;

  async function save() {
    setSaving(true);
    try {
      const requiredFields = requiredFieldsByResource[resource.key] ?? [];
      const missing = requiredFields.filter((field) => visibleFields.includes(field) && !(values[field] ?? "").trim());
      if (missing.length) {
        throw new Error(`Complete ${missing.map(displayFieldLabel).join(", ")} before saving.`);
      }
      const uploadedValues: Record<string, unknown> = {};
      const tickets = await Promise.all(Object.entries(files).flatMap(([uploadKey, selected]) => selected.map((file) => uploadAdminFile(resource.key, uploadKey, file))));
      for (const ticket of tickets) {
        for (const [field, value] of Object.entries(ticket.values)) {
          uploadedValues[field] = Array.isArray(value)
            ? [...(Array.isArray(uploadedValues[field]) ? uploadedValues[field] as unknown[] : []), ...value]
            : value;
        }
      }
      if (resource.key === "accommodations") {
        const uploaded = Array.isArray(uploadedValues.image_urls) ? uploadedValues.image_urls.map(String) : [];
        const gallery = [...new Set([...keptAccommodationImages, ...uploaded])];
        if (gallery.length > 8) throw new Error("An accommodation can have no more than 8 photos.");
        uploadedValues.image_urls = gallery;
        uploadedValues.image_url = gallery[0] ?? null;
      }
      const payload = Object.fromEntries(visibleFields.map((field) => [field, parseValue(field, values[field] ?? "", row?.[field])]));
      if (resource.key === "accommodations" && values.nsfas_accredited === "true") payload.monthly_price = 0;
      if (resource.key === "career_opportunities") payload.requirements = (values.requirements ?? "").split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean);
      await adminApi({ action: "save", resource: resource.key, identity, values: { ...payload, ...uploadedValues } });
      onSaved();
    } catch (error) { onNotify(error instanceof Error ? error.message : "Unable to save", true); }
    finally { setSaving(false); }
  }

  return <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="record-drawer" aria-label={`${row ? "Edit" : "Create"} ${resource.label}`}><header><div><p className="eyebrow">Administrator editor</p><h2>{row ? `${readonly ? "View" : "Edit"} ${resource.label}` : `New ${resource.label}`}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close editor">×</button></header><div className="drawer-body">
    {readonly && row ? <ReadableRecord resourceKey={resource.key} row={row} lookups={lookups} /> : visibleFields.map((field) => <SemanticField key={field} resourceKey={resource.key} field={field} value={values[field] ?? ""} original={row?.[field]} lookups={lookups} required={(requiredFieldsByResource[resource.key] ?? []).includes(field)} onChange={(value) => setValues((current) => ({ ...current, [field]: value }))} />)}
    {!readonly && resource.key === "accommodations" && keptAccommodationImages.length ? <div className="admin-photo-gallery"><header><b>Current property gallery</b><small>Remove outdated photos before saving.</small></header><div>{keptAccommodationImages.map((url, index) => <figure key={url}><img src={url} alt={`Property ${index + 1}`} /><button type="button" aria-label={`Remove property photo ${index + 1}`} onClick={() => setKeptAccommodationImages((current) => current.filter((item) => item !== url))}>×</button></figure>)}</div></div> : null}
    {!readonly ? (uploadDefinitions[resource.key] ?? []).map((upload) => { const selected = files[upload.key] ?? []; return <label className="upload-field" key={upload.key}><span className="upload-icon">⇧</span><span><b>{upload.label}</b><small>{selected.length ? `${selected.length} ${selected.length === 1 ? "file" : "files"} selected` : upload.helper}</small></span><input type="file" accept={upload.accept} multiple={upload.multiple} onChange={(event) => { const chosen = Array.from(event.target.files ?? []); const limit = upload.maxFiles ?? 1; const occupied = resource.key === "accommodations" ? keptAccommodationImages.length : 0; if (chosen.length + occupied > limit) { onNotify(`Choose no more than ${limit - occupied} additional ${limit - occupied === 1 ? "photo" : "photos"}.`, true); event.target.value = ""; return; } setFiles((current) => ({ ...current, [upload.key]: chosen.slice(0, limit) })); if (academicDocument && resource.key !== "past_papers" && chosen[0]) setValues((current) => ({ ...current, title: current.title || chosen[0]!.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ") })); }} /><em>{selected.length ? "Change" : upload.multiple ? "Choose photos" : "Choose file"}</em></label>; }) : null}
  </div><footer><button className="button ghost" onClick={onClose}>{readonly ? "Close" : "Cancel"}</button>{!readonly ? <button className="button primary" disabled={saving} onClick={() => void save()}>{saving ? "Uploading and saving…" : "Save changes"}</button> : null}</footer></aside></div>;
}

function SemanticField({ resourceKey, field, value, original, lookups, required, onChange }: { resourceKey: string; field: string; value: string; original: unknown; lookups: LookupCatalog; required: boolean; onChange: (value: string) => void }) {
  const options = optionsFor(resourceKey, field, lookups);
  const copy = booleanCopy[field] ?? (typeof original === "boolean" ? ["Enabled", "Disabled"] : null);
  const label = displayFieldLabel(field);
  if (copy) return <label className="choice-field"><span><b>{label}</b><small>Choose the appropriate state</small></span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="true">{copy[0]}</option><option value="false">{copy[1]}</option></select></label>;
  const fieldLabel = <span>{label}{required ? <sup aria-hidden="true"> *</sup> : null}</span>;
  if (options.length || relationLookups[field]) return <label className="form-field">{fieldLabel}<select required={required} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Choose {label.toLowerCase()}…</option>{options.map((item) => <option key={item.value} value={item.value}>{item.label}{item.description ? ` — ${item.description}` : ""}</option>)}</select></label>;
  if (isDateTimeField(field)) return <label className="form-field">{fieldLabel}<input required={required} type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
  if (isDateField(field)) return <label className="form-field">{fieldLabel}<input required={required} type="date" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
  if (isLongField(field) || typeof original === "object") return <label className="form-field">{fieldLabel}<textarea required={required} rows={5} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
  return <label className="form-field">{fieldLabel}<input required={required} type={numberFields.has(field) || typeof original === "number" ? "number" : "text"} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ReadableRecord({ resourceKey, row, lookups }: { resourceKey: string; row: Record<string, unknown>; lookups: LookupCatalog }) {
  const entries = Object.entries(row).filter(([field]) => !systemColumns.has(field) && (!field.endsWith("_id") || Boolean(relationLookups[field])) && !field.startsWith("_") && !field.includes("token"));
  return <dl className="readable-record">{entries.map(([field, value]) => <div key={field}><dt>{displayFieldLabel(field)}</dt><dd>{displayValue(resourceKey, field, value, lookups)}</dd></div>)}</dl>;
}
