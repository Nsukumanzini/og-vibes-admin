export type AdminProfile = {
  id: string;
  email: string;
  nickname?: string;
  role: string;
  photo_url?: string;
  access_role: "owner" | "vice_admin";
  access_label: "Owner" | "Vice Admin";
  can_manage_admins: boolean;
  can_delete: boolean;
  can_export_audit: boolean;
};

export type Resource = {
  key: string;
  label: string;
  group: string;
  primaryKey?: string[];
  search?: string[];
  editable?: string[];
  create?: boolean;
  delete?: boolean;
  readOnly?: boolean;
};

export type LookupOption = {
  value: string;
  label: string;
  description?: string;
  image?: string;
};

export type LookupCatalog = Record<string, LookupOption[]>;

export type UploadDefinition = {
  key: string;
  label: string;
  helper: string;
  accept: string;
  multiple?: boolean;
  maxFiles?: number;
};

export type DashboardData = {
  metrics: Record<string, number>;
  recentAudit: Record<string, unknown>[];
  recentSos: Record<string, unknown>[];
};

export type AuthUser = {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  banned_until?: string;
  email_confirmed_at?: string;
  profile?: Record<string, unknown>;
};

export const glyphs: Record<string, string> = {
  Overview: "⌂", People: "◎", Moderation: "◇", Academics: "▤",
  "Academic content": "▥", Assessments: "✓", Communication: "◉",
  Community: "♧", Campus: "⌖", Marketplace: "◫", Careers: "↗",
  Safety: "✚", Support: "♡", Operations: "◌", "AI Assistant": "✦",
  System: "⚙",
};

export function formatValue(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}T/.test(text) ? new Date(text) : null;
  return date && !Number.isNaN(date.valueOf()) ? date.toLocaleString() : text;
}

export function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
