import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { JWT } from "npm:google-auth-library@9.15.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "register" | "unregister" | "send" | "send_module_invite";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function stringValue(value: unknown, max = 4096) {
  return typeof value === "string" && value.length > 0 && value.length <= max
    ? value
    : null;
}

async function accessToken() {
  const encoded = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64");
  if (!encoded) throw new Error("Firebase service account is not configured");
  const account = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded), c => c.charCodeAt(0))));
  const client = new JWT({
    email: account.client_email,
    key: account.private_key,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const credentials = await client.authorize();
  if (!credentials.access_token) throw new Error("Unable to authorize Firebase messaging");
  return { token: credentials.access_token, projectId: account.project_id as string };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Authentication required" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const publishable = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(url, publishable, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401);
  const user = authData.user;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const action = body.action as Action;

  if (action === "register") {
    const token = stringValue(body.token);
    const deviceId = stringValue(body.deviceId, 200);
    const platform = body.platform === "android" || body.platform === "web"
      ? body.platform
      : null;
    if (!token || !deviceId || !platform) {
      return json({ error: "Invalid token registration" }, 400);
    }
    await admin.from("device_push_tokens")
      .delete()
      .eq("platform", platform)
      .eq("device_id", deviceId)
      .neq("token", token);
    const { error } = await admin.from("device_push_tokens").upsert({
      user_id: user.id,
      token,
      platform,
      device_id: deviceId,
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "token" });
    if (error) return json({ error: "Unable to register this device" }, 500);
    await admin.from("device_push_tokens")
      .delete()
      .lt("last_seen_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString());
    return json({ registered: true });
  }

  if (action === "unregister") {
    const deviceId = stringValue(body.deviceId, 200);
    if (!deviceId) return json({ error: "Invalid device identifier" }, 400);
    await admin.from("device_push_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("device_id", deviceId);
    return json({ unregistered: true });
  }

  if (action === "send_module_invite") {
    const invitationId = stringValue(body.invitationId, 100);
    if (!invitationId) return json({ error: "Invalid invitation identifier" }, 400);
    const { data: invitation, error: invitationError } = await admin
      .from("module_invitations")
      .select("id,module_id,lecturer_id,student_id,status,expires_at,academic_year,semester")
      .eq("id", invitationId)
      .maybeSingle();
    if (invitationError || !invitation) return json({ error: "Invitation not found" }, 404);
    const { data: actorProfile } = await admin.from("profiles").select("role,name,surname,nickname").eq("id", user.id).maybeSingle();
    if (invitation.lecturer_id !== user.id && actorProfile?.role !== "admin") {
      return json({ error: "Only the module lecturer may notify this student" }, 403);
    }
    if (invitation.status !== "pending" || new Date(invitation.expires_at).getTime() <= Date.now()) {
      return json({ error: "Invitation is no longer active" }, 409);
    }
    if (!invitation.student_id) return json({ sent: 0, failed: 0, reason: "No registered student account" });

    const [{ data: module }, { data: registrations }] = await Promise.all([
      admin.from("modules").select("name,code").eq("id", invitation.module_id).maybeSingle(),
      admin.from("device_push_tokens")
        .select("id,token,platform")
        .eq("user_id", invitation.student_id)
        .gte("last_seen_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString()),
    ]);
    if (!registrations?.length) return json({ sent: 0, failed: 0 });
    let credentials;
    try {
      credentials = await accessToken();
    } catch {
      return json({ error: "Firebase sender is not configured" }, 503);
    }
    const lecturerName = actorProfile?.nickname?.trim()
      || [actorProfile?.name, actorProfile?.surname].filter(Boolean).join(" ").trim()
      || "Your lecturer";
    const moduleName = module?.name || "a module";
    const moduleCode = module?.code || "";
    const webBase = Deno.env.get("STUDENT_APP_URL") || "https://student.ogvibes.co.za/";
    const separator = webBase.includes("?") ? "&" : "?";
    let sent = 0;
    let failed = 0;
    for (const registration of registrations) {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${credentials.projectId}/messages:send`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${credentials.token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message: {
            token: registration.token,
            notification: {
              title: "New module invitation",
              body: `${lecturerName} invited you to ${moduleCode ? `${moduleCode} · ` : ""}${moduleName}`,
            },
            data: {
              event: "module_invitation",
              invitation_id: invitation.id,
              module_id: invitation.module_id,
              module_name: moduleName,
              module_code: moduleCode,
              lecturer_name: lecturerName,
            },
            android: { priority: "high", ttl: "1209600s" },
            webpush: {
              headers: { Urgency: "high", TTL: "1209600" },
              fcm_options: { link: `${webBase}${separator}moduleInvite=${invitation.id}` },
            },
          } }),
        },
      );
      if (response.ok) {
        sent++;
        await admin.from("device_push_tokens").update({ last_seen_at: new Date().toISOString() }).eq("id", registration.id);
      } else {
        failed++;
        const payload = await response.json().catch(() => ({}));
        const serialized = JSON.stringify(payload);
        if (response.status === 404 || serialized.includes("UNREGISTERED")) {
          await admin.from("device_push_tokens").delete().eq("id", registration.id);
        }
      }
    }
    return json({ sent, failed });
  }

  if (action !== "send") return json({ error: "Unknown action" }, 400);
  const callId = stringValue(body.callId, 100);
  if (!callId) return json({ error: "Invalid call identifier" }, 400);

  const { data: call, error: callError } = await admin.from("calls")
    .select("id,caller_id,callee_id,type,status")
    .eq("id", callId)
    .single();
  if (callError || !call) return json({ error: "Call not found" }, 404);
  if (call.caller_id !== user.id) return json({ error: "Only the caller may notify" }, 403);
  if (call.status !== "ringing") return json({ error: "Call is no longer ringing" }, 409);

  const { data: blocked } = await admin.from("blocked_users")
    .select("id")
    .eq("user_id", call.callee_id)
    .eq("blocked_user_id", call.caller_id)
    .maybeSingle();
  if (blocked) return json({ error: "Recipient is unavailable" }, 403);

  const [{ data: profile }, { data: registrations }] = await Promise.all([
    admin.from("profiles").select("name,surname,nickname").eq("id", user.id).maybeSingle(),
    admin.from("device_push_tokens")
      .select("id,token,platform")
      .eq("user_id", call.callee_id)
      .gte("last_seen_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString()),
  ]);
  const nickname = profile?.nickname?.trim();
  const fullName = [profile?.name, profile?.surname].filter(Boolean).join(" ").trim();
  const callerName = nickname || fullName || "OG Vibes student";
  if (!registrations?.length) return json({ sent: 0, failed: 0 });

  let credentials;
  try {
    credentials = await accessToken();
  } catch {
    return json({ error: "Firebase sender is not configured" }, 503);
  }

  let sent = 0;
  let failed = 0;
  const webBase = Deno.env.get("STUDENT_APP_URL") || "https://student.ogvibes.co.za/";
  const separator = webBase.includes("?") ? "&" : "?";
  for (const registration of registrations) {
    const message = {
      token: registration.token,
      data: {
        event: "incoming_call",
        call_id: call.id,
        caller_id: call.caller_id,
        caller_name: callerName,
        call_type: call.type,
      },
      android: { priority: "high", ttl: "60s" },
      webpush: {
        headers: { Urgency: "high", TTL: "60" },
        fcm_options: { link: `${webBase}${separator}callId=${call.id}` },
      },
    };
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${credentials.projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      },
    );
    if (response.ok) {
      sent++;
      await admin.from("device_push_tokens")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", registration.id);
    } else {
      failed++;
      const payload = await response.json().catch(() => ({}));
      const serialized = JSON.stringify(payload);
      if (response.status === 404 || serialized.includes("UNREGISTERED")) {
        await admin.from("device_push_tokens").delete().eq("id", registration.id);
      }
    }
  }
  return json({ sent, failed });
});
