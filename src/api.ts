import { createClient } from "@supabase/supabase-js";

// Both values are public browser credentials. The fallback keeps production
// builds deterministic while still allowing preview environments to override
// them through Vite environment variables.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  || "https://qcxqmsczkbtfimluinig.supabase.co";
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjeHFtc2N6a2J0ZmltbHVpbmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzU0NDgsImV4cCI6MjA5NzY1MTQ0OH0.ubqHOH1dzO5oe8TJ9NSXDXU7RDPi4EOTrI0ouE-DGDo";

export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string; email?: string };
};

const sessionKey = "og-vibes-admin-session";
const storageClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function configurationReady() {
  return Boolean(supabaseUrl && anonKey);
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(sessionKey);
    return raw ? JSON.parse(raw) as Session : null;
  } catch { return null; }
}

function storeSession(session: Session | null) {
  if (session) localStorage.setItem(sessionKey, JSON.stringify(session));
  else localStorage.removeItem(sessionKey);
}

export async function signIn(email: string, password: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.msg || "Sign in failed");
  storeSession(data as Session);
  return data as Session;
}

async function refreshSession(session: Session) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const data = await response.json();
  if (!response.ok) {
    storeSession(null);
    throw new Error("Your session expired. Please sign in again.");
  }
  storeSession(data as Session);
  return data as Session;
}

export async function signOut() {
  const session = getSession();
  storeSession(null);
  if (session) {
    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: anonKey, Authorization: `Bearer ${session.access_token}` },
    }).catch(() => undefined);
  }
}

export async function adminApi<T>(body: Record<string, unknown>, retry = true): Promise<T> {
  let session = getSession();
  if (!session) throw new Error("Authentication required");
  if (session.expires_at && session.expires_at * 1000 < Date.now() + 30_000) {
    session = await refreshSession(session);
  }
  const response = await fetch(`${supabaseUrl}/functions/v1/admin-control`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (response.status === 401 && retry) {
    await refreshSession(session);
    return adminApi<T>(body, false);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Admin request failed");
  return data as T;
}

export async function uploadAdminFile(resource: string, uploadKey: string, file: File) {
  const ticket = await adminApi<{
    bucket: string;
    path: string;
    token: string;
    publicUrl?: string;
    values: Record<string, unknown>;
  }>({
    action: "upload_ticket",
    resource,
    uploadKey,
    file: { name: file.name, type: file.type, size: file.size },
  });
  const { error } = await storageClient.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    });
  if (error) {
    await adminApi({
      action: "record_upload_failure",
      source: "admin-app",
      resource,
      errorType: error.name || "storage_upload_failed",
    }).catch(() => undefined);
    throw new Error(error.message || "File upload failed");
  }
  return ticket;
}
