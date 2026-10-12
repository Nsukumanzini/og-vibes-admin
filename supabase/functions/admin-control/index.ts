import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Resource = {
  label: string;
  group: string;
  primaryKey?: string[];
  search?: string[];
  editable?: string[];
  create?: boolean;
  delete?: boolean;
  readOnly?: boolean;
  hidden?: string[];
};

const resources: Record<string, Resource> = {
  profiles: { label: "Students & staff", group: "People", search: ["nickname", "email", "student_number", "campus"], editable: ["nickname", "campus", "department", "faculty", "course", "level", "student_type", "is_verified", "role"], hidden: ["phone", "timezone_name", "timezone_offset", "device_locale", "suspended_by"] },
  lecturer_applications: { label: "Lecturer applications", group: "People", search: ["status", "admin_note"], editable: ["status", "admin_note"], delete: false },
  friend_requests: { label: "Friend requests", group: "People", editable: ["status"], delete: true },
  friendships: { label: "Friendships", group: "People", readOnly: true, primaryKey: ["user_id", "friend_id"] },
  blocked_users: { label: "User blocks", group: "People", readOnly: true },
  posts: { label: "Feed posts", group: "Community", search: ["content"], editable: ["content", "is_deleted", "tags"], delete: true },
  comments: { label: "Comments", group: "Community", search: ["text"], editable: ["text"], delete: true },
  reports: { label: "Post reports", group: "Moderation", search: ["reason", "status"], editable: ["status"], delete: true },
  chat_reports: { label: "Chat reports", group: "Moderation", search: ["reason", "details", "status"], editable: ["status"], delete: true },
  group_reports: { label: "Group reports", group: "Moderation", search: ["reason", "status"], editable: ["status"], delete: true },
  marketplace_reports: { label: "Marketplace reports", group: "Moderation", search: ["reason", "status"], editable: ["status"], delete: true },
  accommodation_reports: { label: "Accommodation reports", group: "Moderation", search: ["reason", "details", "status"], editable: ["status", "resolution_note"] },
  bug_reports: { label: "Bug reports", group: "Support", search: ["description"], delete: true },
  suggestion_submissions: { label: "Suggestions", group: "Support", search: ["message", "category", "status"], editable: ["status"], delete: true },
  whistleblower_reports: { label: "Whistleblower reports", group: "Safety", search: ["incident_type", "location", "description", "status"], editable: ["status"], delete: true },
  academic_support_requests: { label: "Academic support", group: "Support", search: ["module", "help_type", "description", "status"], editable: ["status"], delete: true },
  support_donations: { label: "Support donations", group: "Support", search: ["item", "details", "status"], editable: ["status"], delete: true },
  app_takeover_notices: { label: "Full-screen notices", group: "Communication", search: ["title", "message", "notice_kind"], editable: ["title", "message", "notice_kind", "is_blocking", "is_active", "starts_at", "ends_at"], create: true, delete: true },
  student_notifications: { label: "Student notifications", group: "Communication", search: ["title", "body", "category", "delivery_status"], readOnly: true },
  admin_alerts: { label: "Admin alerts", group: "Communication", search: ["type", "status"], editable: ["status"], delete: true },
  app_content: { label: "App content", group: "Communication", search: ["section", "slug", "title"], editable: ["section", "slug", "title", "subtitle", "data", "sort_order", "is_active"], create: true, delete: true },
  programmes: { label: "Programmes", group: "Academics", search: ["name"], editable: ["name"], create: true, delete: true },
  modules: { label: "Modules", group: "Academics", search: ["name", "code"], editable: ["name", "code", "programme_id", "level"], create: true, delete: true },
  module_lecturers: { label: "Module lecturers", group: "Academics", editable: ["module_id", "lecturer_id"], create: true, delete: true },
  module_invitations: { label: "Module invitations", group: "Academics", search: ["invited_email", "status"], editable: ["module_id", "lecturer_id", "student_id", "invited_email", "status", "academic_year", "semester", "expires_at"], create: true, delete: true },
  student_module_registrations: { label: "Module registrations", group: "Academics", primaryKey: ["student_id", "module_id", "academic_year", "semester"], editable: ["status", "academic_year", "semester"], create: true, delete: true },
  past_papers: { label: "Past papers", group: "Academic content", search: ["title", "subject", "level"], editable: ["title", "subject", "level", "year", "exam_type", "url", "storage_path", "module_id"], create: true, delete: true },
  lecture_slides: { label: "Lecture slides", group: "Academic content", search: ["title", "subject", "level"], editable: ["title", "subject", "level", "url", "storage_path", "module_id"], create: true, delete: true },
  timetables: { label: "Timetables", group: "Academic content", search: ["title", "programme", "level", "module"], editable: ["title", "programme", "level", "group_name", "module", "url", "storage_path", "module_id"], create: true, delete: true },
  online_classes: { label: "Online classes", group: "Academic content", search: ["topic", "subject", "status"], editable: ["module", "subject", "topic", "status", "scheduled_at", "url", "resource_title", "resource_url", "recording_url", "duration_minutes", "module_id", "lecturer_id"], create: true, delete: true },
  online_class_attendance: { label: "Class attendance", group: "Academic content", readOnly: true },
  assessment_briefs: { label: "Assessments", group: "Assessments", search: ["title", "subject", "level"], editable: ["title", "subject", "level", "instructions", "due_at", "allow_late", "published", "assessment_type", "venue", "duration_minutes", "weight_percent", "module_id", "lecturer_id", "attachment_storage_path", "attachment_file_name", "attachment_mime_type", "attachment_file_size_bytes"], create: true, delete: true },
  assignment_submissions: { label: "Submissions", group: "Assessments", search: ["title", "subject", "status", "grade"], editable: ["status", "grade", "feedback", "extension_status"], delete: false },
  quizzes: { label: "Quizzes", group: "Assessments", search: ["title", "description", "difficulty"], editable: ["title", "description", "published", "duration_minutes", "passing_score", "available_from", "closes_at", "difficulty", "max_attempts", "secure_mode", "instructions", "results_release", "module_id", "lecturer_id", "attachment_storage_path", "attachment_file_name", "attachment_mime_type", "attachment_file_size_bytes"], create: true, delete: true },
  quiz_questions: { label: "Quiz questions", group: "Assessments", search: ["question_text"], editable: ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_option", "points", "position", "quiz_id", "attachment_storage_path", "attachment_file_name", "attachment_mime_type", "attachment_file_size_bytes"], create: true, delete: true },
  quiz_attempts: { label: "Quiz attempts", group: "Assessments", readOnly: true },
  quiz_security_events: { label: "Quiz security", group: "Assessments", readOnly: true },
  icass_marks: { label: "ICASS marks", group: "Assessments", editable: ["student_id", "subject_name", "lecturer_name", "component_name", "component_score", "module_id", "academic_year", "semester", "component_weight", "mark_status", "assessment_date", "published"], create: true, delete: true },
  events: { label: "Events & approvals", group: "Campus", search: ["title", "venue", "category", "status", "approval_status"], editable: ["title", "description", "venue", "price", "date", "end_date", "campus", "organisation", "category", "organizer_name", "capacity", "published", "status", "approval_status", "review_note", "image_url"], create: true, delete: true },
  accommodations: { label: "Student accommodation", group: "Campus", search: ["title", "address", "campus", "room_type", "contact_name"], editable: ["title", "description", "address", "campus", "distance_km", "monthly_price", "room_type", "nsfas_accredited", "nsfas_accreditation_expires_on", "verified_landlord", "amenities", "image_url", "image_urls", "contact_name", "contact_phone", "contact_email", "available_spaces", "is_active"], create: true, delete: true },
  event_attendees: { label: "Event attendance", group: "Campus", readOnly: true, primaryKey: ["event_id", "user_id"] },
  lost_and_found_items: { label: "Lost & found", group: "Campus", search: ["title", "description", "status", "category"], editable: ["status", "title", "description", "category", "report_type", "found_at", "collect_at", "requirements", "claim_question", "reward_text"], delete: true },
  lost_and_found_claims: { label: "Lost item claims", group: "Campus", search: ["status", "verification_answer", "owner_note"], editable: ["status", "owner_note", "responded_at"], delete: true },
  products: { label: "Marketplace listings", group: "Marketplace", search: ["title", "category", "description", "status"], editable: ["title", "price", "category", "description", "status", "condition", "campus", "meetup_point", "is_negotiable", "images", "image_paths"], delete: true },
  marketplace_orders: { label: "Marketplace orders", group: "Marketplace", search: ["status", "kind"], editable: ["status", "amount", "meetup_point"], delete: false },
  career_opportunities: { label: "Career opportunities", group: "Careers", search: ["title", "company", "category"], editable: ["title", "description", "category", "company", "duration", "salary", "location", "is_remote", "application_url", "closing_at", "requirements", "is_published", "is_verified"], create: true, delete: true },
  career_applications: { label: "Career applications", group: "Careers", search: ["status", "cover_note"], editable: ["status"], delete: false },
  career_resources: { label: "Career resources", group: "Careers", search: ["title", "summary"], editable: ["slug", "title", "summary", "body", "icon_name", "is_active", "sort_order"], create: true, delete: true },
  sos_incidents: { label: "SOS response centre", group: "Safety", search: ["emergency_type", "status", "campus"], editable: ["status"], delete: false },
  sos_location_updates: { label: "SOS locations", group: "Safety", readOnly: true },
  sos_evidence: { label: "SOS evidence", group: "Safety", readOnly: true },
  safety_responders: { label: "Safety responders", group: "Safety", primaryKey: ["user_id"], editable: ["user_id", "responder_type", "campus", "active"], create: true, delete: true },
  calls: { label: "Call history", group: "Operations", search: ["type", "status"], readOnly: true },
  messages: { label: "Private-message telemetry", group: "Operations", readOnly: true, hidden: ["text", "attachment_url"] },
  group_chats: { label: "Groups", group: "Community", search: ["name", "description", "visibility", "category"], editable: ["name", "description", "visibility", "category", "avatar_url", "banner_url", "accent_color", "rules"], delete: true },
  group_members: { label: "Group members", group: "Community", editable: ["role", "muted"], delete: true, primaryKey: ["group_id", "user_id"] },
  group_messages: { label: "Group-message telemetry", group: "Operations", readOnly: true, hidden: ["text", "attachment_url"] },
  device_push_tokens: { label: "Push devices", group: "Operations", readOnly: true, hidden: ["token"] },
  notification_preferences: { label: "Notification preferences", group: "Operations", readOnly: true, primaryKey: ["user_id"] },
  download_history: { label: "Download activity", group: "Operations", readOnly: true },
  academic_assistant_documents: { label: "OG Assistant documents", group: "AI Assistant", search: ["title", "source_type", "index_status"], editable: ["approved", "index_status"], delete: true },
  academic_assistant_chunks: { label: "OG Assistant index", group: "AI Assistant", readOnly: true },
  admin_audit_logs: { label: "Admin audit log", group: "System", readOnly: true },
  admin_login_events: { label: "Admin login history", group: "System", search: ["email", "ip_address", "user_agent"], readOnly: true },
};

type UploadRule = {
  bucket: string;
  public: boolean;
  accept: string[];
  maxBytes: number;
  values: (path: string, file: { name: string; type: string; size: number }, publicUrl?: string) => Record<string, unknown>;
};

const academicFileValues = (path: string) => ({ storage_path: path, url: null });
const assessmentFileValues = (path: string, file: { name: string; type: string; size: number }) => ({
  attachment_storage_path: path,
  attachment_file_name: file.name,
  attachment_mime_type: file.type || "application/octet-stream",
  attachment_file_size_bytes: file.size,
});

const uploadRules: Record<string, Record<string, UploadRule>> = {
  past_papers: { document: { bucket: "academic-content", public: false, accept: ["application/pdf"], maxBytes: 52_428_800, values: academicFileValues } },
  lecture_slides: { document: { bucket: "academic-content", public: false, accept: ["application/pdf"], maxBytes: 52_428_800, values: academicFileValues } },
  timetables: { document: { bucket: "academic-content", public: false, accept: ["application/pdf"], maxBytes: 52_428_800, values: academicFileValues } },
  assessment_briefs: { attachment: { bucket: "academic-content", public: false, accept: ["application/pdf"], maxBytes: 52_428_800, values: assessmentFileValues } },
  quizzes: { attachment: { bucket: "academic-content", public: false, accept: ["application/pdf"], maxBytes: 52_428_800, values: assessmentFileValues } },
  quiz_questions: { attachment: { bucket: "academic-content", public: false, accept: ["application/pdf"], maxBytes: 52_428_800, values: assessmentFileValues } },
  events: { image: { bucket: "admin-media", public: true, accept: ["image/jpeg", "image/png", "image/webp", "image/gif"], maxBytes: 10_485_760, values: (_path, _file, publicUrl) => ({ image_url: publicUrl }) } },
  accommodations: { images: { bucket: "admin-media", public: true, accept: ["image/jpeg", "image/png", "image/webp"], maxBytes: 10_485_760, values: (_path, _file, publicUrl) => ({ image_urls: publicUrl ? [publicUrl] : [], image_url: publicUrl }) } },
  group_chats: {
    avatar: { bucket: "admin-media", public: true, accept: ["image/jpeg", "image/png", "image/webp", "image/gif"], maxBytes: 10_485_760, values: (_path, _file, publicUrl) => ({ avatar_url: publicUrl }) },
    banner: { bucket: "admin-media", public: true, accept: ["image/jpeg", "image/png", "image/webp", "image/gif"], maxBytes: 10_485_760, values: (_path, _file, publicUrl) => ({ banner_url: publicUrl }) },
  },
  products: { image: { bucket: "products", public: true, accept: ["image/jpeg", "image/png", "image/webp"], maxBytes: 10_485_760, values: (path, _file, publicUrl) => ({ images: publicUrl ? [publicUrl] : [], image_paths: [path] }) } },
};

const normalizeFileName = (name: string) => {
  const parts = name.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").split(".");
  const extension = parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : "";
  return `${parts.join(".").slice(0, 80) || "file"}${extension}`;
};

const jwtPayload = (token: string) => {
  try {
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="))) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const corsHeaders = (request: Request) => ({
  "Access-Control-Allow-Origin": request.headers.get("origin") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const json = (request: Request, body: unknown, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders(request), "Content-Type": "application/json" } },
);

const operationErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }
  return "Admin operation failed";
};

const cleanRecord = (record: Record<string, unknown>, resource: Resource) => {
  const copy = { ...record };
  for (const key of resource.hidden ?? []) delete copy[key];
  return copy;
};

const personLabel = (profile: Record<string, unknown>) =>
  String(profile.nickname || profile.email || "OG Vibes user");

const option = (value: unknown, label: unknown, description?: unknown, image?: unknown) => ({
  value: String(value ?? ""),
  label: String(label ?? "Unnamed record"),
  description: description == null ? undefined : String(description),
  image: image == null ? undefined : String(image),
});

async function loadLookups(service: ReturnType<typeof createClient>) {
  const [profileResult, programmeResult, moduleResult, quizResult, briefResult, groupResult, productResult, accommodationResult] = await Promise.all([
    service.from("profiles").select("id,nickname,email,role,student_number,photo_url,account_status,level,campus,course,faculty").order("nickname").limit(1000),
    service.from("programmes").select("id,name").order("name").limit(1000),
    service.from("modules").select("id,name,code,level,programme_id").order("name").limit(1000),
    service.from("quizzes").select("id,title,module_id").order("title").limit(1000),
    service.from("assessment_briefs").select("id,title,module_id").order("title").limit(1000),
    service.from("group_chats").select("id,name,category,avatar_url").order("name").limit(1000),
    service.from("products").select("id,title,status,images").order("title").limit(1000),
    service.from("accommodations").select("id,title,campus,room_type,image_urls,image_url,is_active").order("title").limit(1000),
  ]);
  const profiles = (profileResult.data ?? []) as Record<string, unknown>[];
  const programmes = (programmeResult.data ?? []) as Record<string, unknown>[];
  const programmeMap = new Map(programmes.map((row) => [String(row.id), String(row.name)]));
  const modules = (moduleResult.data ?? []) as Record<string, unknown>[];
  const distinctOptions = (values: unknown[]) => [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))].sort().map((value) => option(value, value));
  const people = profiles.map((row) => option(row.id, personLabel(row), `${row.role ?? "student"} · ${row.email ?? "No email"}`, row.photo_url));
  return {
    profiles: people,
    students: profiles.filter((row) => row.role === "student").map((row) => option(row.id, personLabel(row), `${row.student_number ?? "Student"} · ${row.email ?? "No email"}`, row.photo_url)),
    lecturers: profiles.filter((row) => ["lecturer", "staff", "admin"].includes(String(row.role))).map((row) => option(row.id, personLabel(row), `${row.role} · ${row.email ?? "No email"}`, row.photo_url)),
    admins: profiles.filter((row) => row.role === "admin").map((row) => option(row.id, personLabel(row), String(row.email ?? "No email"), row.photo_url)),
    programmes: programmes.map((row) => option(row.id, row.name)),
    programme_names: programmes.map((row) => option(row.name, row.name)),
    modules: modules.map((row) => option(row.id, `${row.code ? `${row.code} · ` : ""}${row.name}`, `${programmeMap.get(String(row.programme_id)) ?? "Programme"} · ${row.level ?? "Level not set"}`)),
    quizzes: ((quizResult.data ?? []) as Record<string, unknown>[]).map((row) => option(row.id, row.title || "Untitled quiz")),
    assessment_briefs: ((briefResult.data ?? []) as Record<string, unknown>[]).map((row) => option(row.id, row.title || "Untitled assessment")),
    groups: ((groupResult.data ?? []) as Record<string, unknown>[]).map((row) => option(row.id, row.name, row.category, row.avatar_url)),
    products: ((productResult.data ?? []) as Record<string, unknown>[]).map((row) => option(row.id, row.title, row.status, Array.isArray(row.images) ? row.images[0] : undefined)),
    accommodations: ((accommodationResult.data ?? []) as Record<string, unknown>[]).map((row) => option(row.id, row.title, `${row.campus ?? "Campus"} · ${row.room_type ?? "Room"}`, Array.isArray(row.image_urls) ? row.image_urls[0] : row.image_url)),
    levels: distinctOptions([...profiles.map((row) => row.level), ...modules.map((row) => row.level)]),
    campuses: distinctOptions(profiles.map((row) => row.campus)),
    courses: distinctOptions(profiles.map((row) => row.course)),
    faculties: distinctOptions(profiles.map((row) => row.faculty)),
  };
}

async function signedMedia(service: ReturnType<typeof createClient>, bucket: string, value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const { data } = await service.storage.from(bucket).createSignedUrl(raw.replace(/^\/+/, ""), 3600);
  return data?.signedUrl ?? null;
}

async function decorateReports(service: ReturnType<typeof createClient>, resourceKey: string, sourceRows: Record<string, unknown>[]) {
  const rows = sourceRows.map((row) => ({ ...row }));
  const ids = (key: string) => [...new Set(rows.map((row) => String(row[key] ?? "")).filter(Boolean))];
  const profileIds = [...new Set([...ids("reporter_id"), ...ids("reported_user_id")])];
  const profileResult = profileIds.length
    ? await service.from("profiles").select("id,nickname,email,photo_url").in("id", profileIds)
    : { data: [] };
  const profiles = new Map(((profileResult.data ?? []) as Record<string, unknown>[]).map((row) => [String(row.id), row]));
  const addPerson = (row: Record<string, unknown>, key: string, prefix: string) => {
    const profile = profiles.get(String(row[key] ?? ""));
    row[`${prefix}_name`] = profile ? personLabel(profile) : "Unknown user";
    row[`${prefix}_email`] = profile?.email ?? null;
    row[`${prefix}_photo`] = profile?.photo_url ?? null;
  };

  if (resourceKey === "reports") {
    const postIds = ids("post_id");
    const commentIds = ids("comment_id");
    const [postResult, commentResult] = await Promise.all([
      postIds.length ? service.from("posts").select("id,user_id,content,images,created_at").in("id", postIds) : Promise.resolve({ data: [] }),
      commentIds.length ? service.from("comments").select("id,author_id,text,created_at").in("id", commentIds) : Promise.resolve({ data: [] }),
    ]);
    const posts = new Map(((postResult.data ?? []) as Record<string, unknown>[]).map((row) => [String(row.id), row]));
    const comments = new Map(((commentResult.data ?? []) as Record<string, unknown>[]).map((row) => [String(row.id), row]));
    const authorIds = [...new Set([...posts.values()].map((row) => String(row.user_id)), [...comments.values()].map((row) => String(row.author_id)))];
    if (authorIds.length) {
      const { data } = await service.from("profiles").select("id,nickname,email,photo_url").in("id", authorIds);
      for (const profile of (data ?? []) as Record<string, unknown>[]) profiles.set(String(profile.id), profile);
    }
    for (const row of rows) {
      addPerson(row, "reporter_id", "reporter");
      const content = posts.get(String(row.post_id ?? "")) ?? comments.get(String(row.comment_id ?? ""));
      const authorId = String(content?.user_id ?? content?.author_id ?? "");
      const author = profiles.get(authorId);
      row.author_name = author ? personLabel(author) : "Unknown author";
      row.author_photo = author?.photo_url ?? null;
      row.content_preview = content?.content ?? content?.text ?? "Content is no longer available";
      row.content_created_at = content?.created_at ?? null;
      const media = Array.isArray(content?.images) ? content?.images[0] : null;
      row.media_url = await signedMedia(service, "posts", media);
      row.reported_item = row.post_id ? "Post" : "Comment";
    }
  } else if (resourceKey === "chat_reports") {
    const messageIds = ids("message_id");
    const { data } = messageIds.length ? await service.from("messages").select("id,sender_id,text,attachment_url,attachment_mime,created_at,is_deleted").in("id", messageIds) : { data: [] };
    const messages = new Map(((data ?? []) as Record<string, unknown>[]).map((row) => [String(row.id), row]));
    for (const row of rows) {
      addPerson(row, "reporter_id", "reporter");
      addPerson(row, "reported_user_id", "author");
      const message = messages.get(String(row.message_id ?? ""));
      row.content_preview = message?.text || (message?.is_deleted ? "Message was deleted" : "Message is unavailable");
      row.content_created_at = message?.created_at ?? null;
      row.media_url = await signedMedia(service, "chat-media", message?.attachment_url);
      row.reported_item = "Private message";
    }
  } else if (resourceKey === "group_reports") {
    const groupIds = ids("group_id");
    const messageIds = ids("message_id");
    const [groupResult, messageResult] = await Promise.all([
      groupIds.length ? service.from("group_chats").select("id,name,avatar_url,created_by,created_at").in("id", groupIds) : Promise.resolve({ data: [] }),
      messageIds.length ? service.from("group_messages").select("id,sender_id,text,attachment_url,attachment_mime,created_at,is_deleted").in("id", messageIds) : Promise.resolve({ data: [] }),
    ]);
    const groups = new Map(((groupResult.data ?? []) as Record<string, unknown>[]).map((row) => [String(row.id), row]));
    const messages = new Map(((messageResult.data ?? []) as Record<string, unknown>[]).map((row) => [String(row.id), row]));
    for (const row of rows) {
      addPerson(row, "reporter_id", "reporter");
      addPerson(row, "reported_user_id", "author");
      const group = groups.get(String(row.group_id ?? ""));
      const message = messages.get(String(row.message_id ?? ""));
      row.content_preview = message?.text || group?.name || "Group content is unavailable";
      row.content_created_at = message?.created_at ?? group?.created_at ?? null;
      row.media_url = message ? await signedMedia(service, "group-media", message.attachment_url) : group?.avatar_url ?? null;
      row.reported_item = message ? `Message in ${group?.name ?? "group"}` : `Group: ${group?.name ?? "Unknown"}`;
    }
  } else if (resourceKey === "marketplace_reports") {
    const productIds = ids("product_id");
    const { data } = productIds.length ? await service.from("products").select("id,seller_id,title,description,images,status,created_at").in("id", productIds) : { data: [] };
    const products = new Map(((data ?? []) as Record<string, unknown>[]).map((row) => [String(row.id), row]));
    const sellerIds = [...new Set([...products.values()].map((row) => String(row.seller_id)).filter(Boolean))];
    if (sellerIds.length) {
      const { data: sellerData } = await service.from("profiles").select("id,nickname,email,photo_url").in("id", sellerIds);
      for (const profile of (sellerData ?? []) as Record<string, unknown>[]) profiles.set(String(profile.id), profile);
    }
    for (const row of rows) {
      addPerson(row, "reporter_id", "reporter");
      const product = products.get(String(row.product_id ?? ""));
      const author = profiles.get(String(product?.seller_id ?? ""));
      row.author_name = author ? personLabel(author) : "Unknown seller";
      row.author_photo = author?.photo_url ?? null;
      row.content_preview = product ? `${product.title}\n${product.description ?? ""}` : "Listing is unavailable";
      row.content_created_at = product?.created_at ?? null;
      row.media_url = Array.isArray(product?.images) ? product?.images[0] ?? null : null;
      row.reported_item = "Marketplace listing";
    }
  }
  return rows;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return json(request, { error: "Authentication required" }, 401);

  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json(request, { error: "Invalid session" }, 401);

  const { data: adminProfile } = await service.from("profiles").select("id,email,nickname,role,photo_url").eq("id", authData.user.id).maybeSingle();
  if (!adminProfile || adminProfile.role !== "admin") return json(request, { error: "Administrator access required" }, 403);

  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return json(request, { error: "Invalid JSON" }, 400); }
  const action = String(input.action ?? "");

  const audit = async (auditAction: string, resource: string, recordId?: string, details: Record<string, unknown> = {}) => {
    await service.from("admin_audit_logs").insert({ admin_id: adminProfile.id, action: auditAction, resource, record_id: recordId ?? null, details });
  };

  try {
    if (action === "session") {
      const claims = jwtPayload(token);
      const sessionId = String(claims.session_id ?? claims.jti ?? `${adminProfile.id}:${claims.iat ?? "session"}`);
      const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      await service.from("admin_login_events").upsert({
        admin_id: adminProfile.id,
        email: adminProfile.email,
        session_id: sessionId,
        ip_address: forwardedFor,
        user_agent: request.headers.get("user-agent"),
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "session_id" });
      return json(request, { admin: adminProfile });
    }

    if (action === "catalog") {
      return json(request, { resources: Object.entries(resources).map(([key, value]) => ({ key, ...value })) });
    }

    if (action === "lookups") return json(request, { lookups: await loadLookups(service) });

    if (action === "admin_activity") {
      const [{ data: admins, error: adminsError }, { data: logins, error: loginsError }] = await Promise.all([
        service.from("profiles").select("id,nickname,email,photo_url,is_verified,account_status,created_at").eq("role", "admin").order("nickname"),
        service.from("admin_login_events").select("id,admin_id,email,ip_address,user_agent,signed_in_at,last_seen_at").order("signed_in_at", { ascending: false }).limit(100),
      ]);
      if (adminsError) throw adminsError;
      if (loginsError) throw loginsError;
      return json(request, { admins: admins ?? [], logins: logins ?? [] });
    }

    if (action === "upload_ticket") {
      const resourceKey = String(input.resource ?? "");
      const uploadKey = String(input.uploadKey ?? "");
      const rule = uploadRules[resourceKey]?.[uploadKey];
      const file = input.file && typeof input.file === "object" ? input.file as { name?: unknown; type?: unknown; size?: unknown } : {};
      const fileMeta = { name: String(file.name ?? "file"), type: String(file.type ?? ""), size: Number(file.size ?? 0) };
      if (!rule) return json(request, { error: "Uploads are not available for this field" }, 400);
      if (!fileMeta.size || fileMeta.size > rule.maxBytes) return json(request, { error: `Choose a file smaller than ${Math.round(rule.maxBytes / 1_048_576)} MB` }, 400);
      if (!rule.accept.includes(fileMeta.type)) return json(request, { error: "This file type is not supported here" }, 400);
      const path = `admin/${resourceKey}/${crypto.randomUUID()}-${normalizeFileName(fileMeta.name)}`;
      const { data, error } = await service.storage.from(rule.bucket).createSignedUploadUrl(path);
      if (error || !data?.token) throw error ?? new Error("Unable to prepare the upload");
      const publicUrl = rule.public ? service.storage.from(rule.bucket).getPublicUrl(path).data.publicUrl : undefined;
      await audit("prepare_upload", rule.bucket, path, { resource: resourceKey, uploadKey, type: fileMeta.type, size: fileMeta.size });
      return json(request, { bucket: rule.bucket, path, token: data.token, publicUrl, values: rule.values(path, fileMeta, publicUrl) });
    }

    if (action === "dashboard") {
      const count = async (table: string, filter?: [string, unknown]) => {
        let query = service.from(table).select("*", { count: "exact", head: true });
        if (filter) query = query.eq(filter[0], filter[1]);
        const { count: total } = await query;
        return total ?? 0;
      };
      const [students, posts, messages, openReports, activeSos, pendingSubmissions, liveClasses, products, notifications, activeNotices] = await Promise.all([
        count("profiles"), count("posts", ["is_deleted", false]), count("messages"), count("reports"), count("sos_incidents", ["status", "active"]), count("assignment_submissions", ["status", "submitted"]), count("online_classes", ["status", "live"]), count("products", ["status", "available"]), count("student_notifications"), count("app_takeover_notices", ["is_active", true]),
      ]);
      const { data: recentAudit } = await service.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(8);
      const { data: recentSos } = await service.from("sos_incidents").select("*").order("created_at", { ascending: false }).limit(5);
      return json(request, { metrics: { students, posts, messages, openReports, activeSos, pendingSubmissions, liveClasses, products, notifications, activeNotices }, recentAudit, recentSos });
    }

    if (action === "sos_detail") {
      const incidentId = String(input.incidentId ?? "");
      if (!incidentId) return json(request, { error: "Choose an SOS incident" }, 400);
      const { data: incident, error: incidentError } = await service
        .from("sos_incidents").select("*").eq("id", incidentId).maybeSingle();
      if (incidentError) throw incidentError;
      if (!incident) return json(request, { error: "SOS incident not found" }, 404);
      const [{ data: student }, { data: locations }, { data: evidence }] = await Promise.all([
        service.from("profiles").select("id,nickname,email,phone,campus,photo_url").eq("id", incident.student_id).maybeSingle(),
        service.from("sos_location_updates").select("latitude,longitude,accuracy_meters,recorded_at").eq("incident_id", incidentId).order("recorded_at", { ascending: false }).limit(100),
        service.from("sos_evidence").select("id,evidence_type,storage_path,mime_type,capture_seconds,created_at").eq("incident_id", incidentId).order("created_at"),
      ]);
      const signedEvidence = await Promise.all((evidence ?? []).map(async (item) => {
        const { data } = await service.storage.from("sos-evidence").createSignedUrl(item.storage_path, 900);
        return { ...item, signed_url: data?.signedUrl ?? null, storage_path: undefined };
      }));
      await audit("view_sos_incident", "sos_incidents", incidentId);
      return json(request, { incident, student, locations: locations ?? [], evidence: signedEvidence });
    }

    if (action === "list") {
      const resourceKey = String(input.resource ?? "");
      const config = resources[resourceKey];
      if (!config) return json(request, { error: "Unknown resource" }, 400);
      const page = Math.max(0, Number(input.page ?? 0));
      const pageSize = Math.min(100, Math.max(10, Number(input.pageSize ?? 25)));
      const from = page * pageSize;
      let query = service.from(resourceKey).select("*", { count: "exact" }).range(from, from + pageSize - 1);
      const filters = input.filters && typeof input.filters === "object" ? input.filters as Record<string, unknown> : {};
      for (const [key, value] of Object.entries(filters)) if (value !== "" && value != null) query = query.eq(key, value);
      const { data, error, count } = await query;
      if (error) throw error;
      let rows = (data ?? []).map((row) => cleanRecord(row, config));
      if (["reports", "chat_reports", "group_reports", "marketplace_reports"].includes(resourceKey)) {
        rows = await decorateReports(service, resourceKey, rows);
      }
      return json(request, { rows, count: count ?? 0, page, pageSize });
    }

    if (action === "save") {
      const resourceKey = String(input.resource ?? "");
      const config = resources[resourceKey];
      if (!config || config.readOnly) return json(request, { error: "Resource is read-only" }, 400);
      const values = input.values && typeof input.values === "object" ? input.values as Record<string, unknown> : {};
      const allowed = new Set(config.editable ?? []);
      const payload: Record<string, unknown> = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.has(key)));
      if (!Object.keys(payload).length) return json(request, { error: "No permitted fields supplied" }, 400);
      if (resourceKey === "modules") {
        if (!payload.name || !payload.programme_id || !payload.level) {
          return json(request, { error: "Module name, programme and level are required" }, 400);
        }
      }
      if (resourceKey === "events") {
        if (!payload.title || !payload.venue || !payload.date) {
          return json(request, { error: "Event title, venue and starting date are required" }, 400);
        }
        const eventDate = new Date(String(payload.date));
        if (Number.isNaN(eventDate.valueOf())) return json(request, { error: "Choose a valid event date and time" }, 400);
        payload.date_label = new Intl.DateTimeFormat("en-ZA", {
          weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
          timeZone: "Africa/Johannesburg",
        }).format(eventDate);
        if (!payload.price) payload.price = "Free";
        if (payload.approval_status === "approved") {
          payload.published = true;
          payload.reviewed_by = adminProfile.id;
          payload.reviewed_at = new Date().toISOString();
        } else if (payload.approval_status === "rejected") {
          payload.published = false;
          payload.reviewed_by = adminProfile.id;
          payload.reviewed_at = new Date().toISOString();
        }
      }
      if (resourceKey === "career_opportunities") {
        if (!payload.title || !payload.category) return json(request, { error: "Opportunity title and category are required" }, 400);
        payload.requirements = Array.isArray(payload.requirements)
          ? payload.requirements.map(String).map((item) => item.trim()).filter(Boolean)
          : String(payload.requirements ?? "").split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean);
      }
      if (resourceKey === "accommodations") {
        if (!payload.title || !payload.address || payload.monthly_price == null || !payload.room_type || !payload.contact_name || !payload.contact_phone) {
          return json(request, { error: "Complete the property name, address, monthly rent, room type and landlord contact details" }, 400);
        }
        const imageUrls = Array.isArray(payload.image_urls) ? payload.image_urls.map(String).filter(Boolean) : [];
        if (imageUrls.length > 8) return json(request, { error: "An accommodation can have no more than 8 photos" }, 400);
        payload.image_urls = imageUrls;
        payload.image_url = imageUrls[0] ?? payload.image_url ?? null;
        if (payload.nsfas_accredited !== true) payload.nsfas_accreditation_expires_on = null;
        if (Number(payload.available_spaces ?? 0) < 0) return json(request, { error: "Available spaces cannot be negative" }, 400);
      }
      if (resourceKey === "accommodation_reports" && ["resolved", "dismissed"].includes(String(payload.status))) {
        payload.reviewed_by = adminProfile.id;
        payload.reviewed_at = new Date().toISOString();
      }
      if (resourceKey === "safety_responders" && (!payload.user_id || !payload.responder_type)) {
        return json(request, { error: "Choose a person and responder type" }, 400);
      }
      const keys = config.primaryKey ?? ["id"];
      const identity = input.identity && typeof input.identity === "object" ? input.identity as Record<string, unknown> : null;
      if (identity) {
        if (resourceKey === "lecturer_applications" && ["approved", "rejected"].includes(String(payload.status))) {
          const decision = String(payload.status);
          const applicationId = String(identity.id ?? "");
          if (!applicationId) return json(request, { error: "Lecturer application is missing" }, 400);
          const { data, error } = await service.rpc("admin_review_lecturer_application", {
            target_application_id: applicationId,
            decision,
            review_note: String(payload.admin_note ?? ""),
            reviewer_id: adminProfile.id,
          });
          if (error) throw error;
          await audit(`${decision === "approved" ? "approve" : "reject"}_lecturer`, resourceKey, applicationId, {
            programme_id: data?.programme_id ?? null,
            requested_module_ids: data?.requested_module_ids ?? [],
          });
          return json(request, { row: cleanRecord(data as Record<string, unknown>, config) });
        }
        let query = service.from(resourceKey).update(payload).select();
        for (const key of keys) query = query.eq(key, identity[key]);
        const { data, error } = await query;
        if (error) throw error;
        await audit("update", resourceKey, keys.map((key) => String(identity[key] ?? "")).join(":"), { fields: Object.keys(payload) });
        return json(request, { row: data?.[0] ?? null });
      }
      if (!config.create) return json(request, { error: "Creation is not allowed for this resource" }, 400);
      if (resourceKey === "app_takeover_notices" || resourceKey === "app_content") payload.created_by = adminProfile.id;
      if (resourceKey === "accommodations") payload.created_by = adminProfile.id;
      if (resourceKey === "events" && !identity) {
        payload.approval_status = "approved";
        payload.published = true;
        payload.reviewed_by = adminProfile.id;
        payload.reviewed_at = new Date().toISOString();
      }
      if (["lecture_slides", "timetables"].includes(resourceKey)) payload.created_by = adminProfile.id;
      if (resourceKey === "module_invitations" && !identity) {
        const rawToken = crypto.randomUUID();
        const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
        payload.token_hash = Array.from(new Uint8Array(hash)).map((value) => value.toString(16).padStart(2, "0")).join("");
        if (!payload.lecturer_id) payload.lecturer_id = adminProfile.id;
      }
      const { data, error } = await service.from(resourceKey).insert(payload).select().single();
      if (error) throw error;
      await audit("create", resourceKey, String(data?.id ?? ""), { fields: Object.keys(payload) });
      return json(request, { row: cleanRecord(data, config) });
    }

    if (action === "remove") {
      const resourceKey = String(input.resource ?? "");
      const config = resources[resourceKey];
      if (!config?.delete) return json(request, { error: "Deletion is not allowed for this resource" }, 400);
      const identity = input.identity && typeof input.identity === "object" ? input.identity as Record<string, unknown> : {};
      const keys = config.primaryKey ?? ["id"];
      let query = service.from(resourceKey).delete();
      for (const key of keys) query = query.eq(key, identity[key]);
      const { error } = await query;
      if (error) throw error;
      const recordId = keys.map((key) => String(identity[key] ?? "")).join(":");
      await audit("delete", resourceKey, recordId);
      return json(request, { ok: true });
    }

    if (action === "moderate_report") {
      const resourceKey = String(input.resource ?? "");
      const reportId = String(input.reportId ?? "");
      const decision = String(input.decision ?? "");
      if (!["reports", "chat_reports", "group_reports", "marketplace_reports"].includes(resourceKey) || !reportId) {
        return json(request, { error: "Invalid report" }, 400);
      }
      const { data: report, error: reportError } = await service.from(resourceKey).select("*").eq("id", reportId).maybeSingle();
      if (reportError) throw reportError;
      if (!report) return json(request, { error: "Report no longer exists" }, 404);
      if (decision === "dismiss") {
        const { error } = await service.from(resourceKey).update({ status: "dismissed" }).eq("id", reportId);
        if (error) throw error;
        await audit("dismiss_report", resourceKey, reportId);
        return json(request, { ok: true });
      }
      if (decision !== "remove_content") return json(request, { error: "Unsupported moderation decision" }, 400);
      if (resourceKey === "reports") {
        if (report.post_id) {
          const { error } = await service.from("posts").update({ is_deleted: true }).eq("id", report.post_id);
          if (error) throw error;
        } else if (report.comment_id) {
          const { error } = await service.from("comments").delete().eq("id", report.comment_id);
          if (error) throw error;
        }
      } else if (resourceKey === "chat_reports" && report.message_id) {
        const { error } = await service.from("messages").update({ is_deleted: true, text: "", attachment_url: null }).eq("id", report.message_id);
        if (error) throw error;
      } else if (resourceKey === "group_reports") {
        if (report.message_id) {
          const { error } = await service.from("group_messages").update({ is_deleted: true, text: "", attachment_url: null }).eq("id", report.message_id);
          if (error) throw error;
        } else if (report.group_id) {
          const { error } = await service.from("group_chats").delete().eq("id", report.group_id);
          if (error) throw error;
        }
      } else if (resourceKey === "marketplace_reports" && report.product_id) {
        const { error } = await service.from("products").update({ status: "archived" }).eq("id", report.product_id);
        if (error) throw error;
      }
      const resolvedStatus = resourceKey === "reports" ? "content_removed" : "resolved";
      const { error: resolutionError } = await service.from(resourceKey).update({ status: resolvedStatus }).eq("id", reportId);
      if (resolutionError) throw resolutionError;
      await audit("remove_reported_content", resourceKey, reportId, { reported_record: report.post_id ?? report.comment_id ?? report.message_id ?? report.group_id ?? report.product_id ?? null });
      return json(request, { ok: true });
    }

    if (action === "auth_users") {
      const page = Math.max(1, Number(input.page ?? 1));
      const { data, error } = await service.auth.admin.listUsers({ page, perPage: 50 });
      if (error) throw error;
      const ids = data.users.map((user) => user.id);
      const { data: profiles } = ids.length ? await service.from("profiles").select("id,nickname,email,role,is_verified,campus,course,photo_url,account_status,suspended_at,suspension_reason").in("id", ids) : { data: [] };
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return json(request, { users: data.users.map((user) => ({ id: user.id, email: user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at, banned_until: user.banned_until, email_confirmed_at: user.email_confirmed_at, profile: profileMap.get(user.id) ?? null })) });
    }

    if (action === "user_status") {
      const userId = String(input.userId ?? "");
      const status = String(input.status ?? "");
      if (!userId || userId === adminProfile.id) return json(request, { error: "You cannot change your own administrator account here" }, 400);
      if (status === "ban") {
        const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
        if (error) throw error;
        const { error: profileError } = await service.from("profiles").update({
          account_status: "suspended",
          suspended_at: new Date().toISOString(),
          suspension_reason: String(input.reason ?? "Suspended by an OG Vibes administrator"),
          suspended_by: adminProfile.id,
        }).eq("id", userId);
        if (profileError) {
          await service.auth.admin.updateUserById(userId, { ban_duration: "none" });
          throw profileError;
        }
        const { error: noticeError } = await service.from("app_takeover_notices").insert({
          title: "Your account has been blocked",
          message: "Your account has been blocked, please contact your admin at email: admin.ogvibes.co.za for assistance.",
          is_blocking: true,
          is_active: true,
          starts_at: new Date().toISOString(),
          ends_at: null,
          created_by: adminProfile.id,
          target_user_id: userId,
          notice_kind: "account_block",
        });
        if (noticeError) throw noticeError;
      } else if (status === "unban") {
        const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: "none" });
        if (error) throw error;
        const { error: profileError } = await service.from("profiles").update({
          account_status: "active",
          suspended_at: null,
          suspension_reason: null,
          suspended_by: null,
        }).eq("id", userId);
        if (profileError) throw profileError;
        const { error: noticeError } = await service.from("app_takeover_notices").update({ is_active: false, ends_at: new Date().toISOString() }).eq("target_user_id", userId).eq("notice_kind", "account_block").eq("is_active", true);
        if (noticeError) throw noticeError;
      } else {
        return json(request, { error: "Unsupported account action" }, 400);
      }
      await audit(status, "auth.users", userId, { reason: input.reason ?? null });
      return json(request, { ok: true });
    }

    if (action === "broadcast") {
      const title = String(input.title ?? "").trim();
      const body = String(input.body ?? "").trim();
      const requestedCategory = String(input.category ?? "campus").trim();
      const categoryAliases: Record<string, string> = { general: "campus", academic: "academics", quiz: "academics", alert: "campus", safety: "campus", event: "campus", message: "messages" };
      const category = categoryAliases[requestedCategory] ?? requestedCategory;
      const route = String(input.route ?? "alerts").trim();
      if (!title || !body) return json(request, { error: "Title and message are required" }, 400);
      if (title.length > 120 || body.length > 500) return json(request, { error: "Keep the title under 120 characters and the message under 500 characters" }, 400);
      if (!["messages", "academics", "campus", "social", "marketplace"].includes(category)) return json(request, { error: "Choose a supported notification category" }, 400);
      const { data: students, error: studentsError } = await service.from("profiles").select("id").eq("role", "student");
      if (studentsError) throw studentsError;
      const batchId = crypto.randomUUID();
      const rows = (students ?? []).map((student) => ({ user_id: student.id, category, title, body, route, metadata: { admin_broadcast: true, batch_id: batchId }, dedupe_key: `admin:${batchId}:${student.id}` }));
      for (let index = 0; index < rows.length; index += 500) {
        const { error } = await service.from("student_notifications").insert(rows.slice(index, index + 500));
        if (error) throw error;
      }
      await audit("broadcast", "student_notifications", batchId, { recipients: rows.length, category, route });
      return json(request, { ok: true, recipients: rows.length });
    }

    return json(request, { error: "Unknown action" }, 400);
  } catch (error) {
    console.error("admin-control", error);
    return json(request, { error: operationErrorMessage(error) }, 500);
  }
});
