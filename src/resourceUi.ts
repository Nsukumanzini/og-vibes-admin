import type { LookupCatalog, LookupOption, UploadDefinition } from "./types";

export const relationLookups: Record<string, string> = {
  programme_id: "programmes",
  module_id: "modules",
  lecturer_id: "lecturers",
  student_id: "students",
  user_id: "profiles",
  reporter_id: "profiles",
  reported_user_id: "profiles",
  created_by: "profiles",
  accepted_by: "students",
  quiz_id: "quizzes",
  brief_id: "assessment_briefs",
  group_id: "groups",
  product_id: "products",
  accommodation_id: "accommodations",
};

export const fieldLabels: Record<string, string> = {
  programme_id: "Programme",
  module_id: "Module",
  lecturer_id: "Lecturer",
  student_id: "Student",
  user_id: "Person",
  quiz_id: "Quiz",
  brief_id: "Assessment",
  group_id: "Group",
  product_id: "Marketplace listing",
  accommodation_id: "Accommodation",
  due_at: "Due date and time",
  scheduled_at: "Class date and time",
  available_from: "Available from",
  closes_at: "Closes at",
  starts_at: "Starts at",
  ends_at: "Ends at",
  is_active: "Availability",
  is_blocking: "Student access",
  published: "Publishing status",
  is_published: "Publishing status",
  is_verified: "Verification",
  allow_late: "Late submissions",
  secure_mode: "Secure quiz mode",
  is_negotiable: "Price negotiation",
  approval_status: "Admin review",
  nsfas_accredited: "NSFAS accreditation",
  verified_landlord: "Landlord verification",
  monthly_price: "Monthly rent",
  distance_km: "Distance from campus (km)",
  nsfas_accreditation_expires_on: "NSFAS accreditation expiry",
  available_spaces: "Available spaces",
  attachment_storage_path: "Supporting file",
  max_file_size_bytes: "Maximum upload size",
  weight_percent: "Weight percentage",
  duration_minutes: "Duration in minutes",
  correct_option: "Correct answer",
  responder_type: "Responder role",
  price: "Ticket price",
  application_url: "Application link, email or physical address",
  requested_module_ids: "Requested modules",
  admin_note: "Review note",
  semester: "NCV level",
  paper_type: "Paper type",
};

export const booleanCopy: Record<string, [string, string]> = {
  is_active: ["Active", "Inactive"],
  active: ["Active", "Inactive"],
  is_blocking: ["Block access", "Allow students to continue"],
  published: ["Published", "Draft"],
  is_published: ["Published", "Draft"],
  is_verified: ["Verified", "Not verified"],
  approved: ["Approved", "Not approved"],
  allow_late: ["Allow late submissions", "Close after deadline"],
  secure_mode: ["Enabled", "Disabled"],
  is_negotiable: ["Negotiation allowed", "Fixed price"],
  is_remote: ["Remote", "On site"],
  nsfas_accredited: ["NSFAS accredited", "Not NSFAS accredited"],
  verified_landlord: ["Verified landlord", "Not yet verified"],
  muted: ["Muted", "Not muted"],
  randomize_questions: ["Randomise", "Keep order"],
  randomize_options: ["Randomise", "Keep order"],
};

export const enumOptions: Record<string, LookupOption[]> = {
  role: ["student", "lecturer", "staff", "admin"].map((value) => ({ value, label: humanise(value) })),
  // The database keeps the legacy numeric academic-period field for existing
  // registrations. The admin experience presents the values as NCV levels.
  semester: [
    { value: "1", label: "NCV Level 2" },
    { value: "2", label: "NCV Level 3" },
    { value: "3", label: "NCV Level 4" },
  ],
  difficulty: ["Foundation", "Standard", "Advanced"].map((value) => ({ value, label: value })),
  results_release: [{ value: "immediate", label: "Immediately" }, { value: "after_close", label: "After closing time" }, { value: "manual", label: "Release manually" }],
  correct_option: [1, 2, 3, 4].map((value) => ({ value: String(value), label: `Option ${String.fromCharCode(64 + value)}` })),
  visibility: [{ value: "public", label: "Public group" }, { value: "private", label: "Private group" }],
  condition: ["New", "Like new", "Good", "Fair"].map((value) => ({ value, label: value })),
  notice_kind: [
    { value: "general", label: "General announcement" },
    { value: "maintenance", label: "Maintenance" },
    { value: "emergency", label: "Emergency" },
  ],
  responder_type: [
    { value: "admin", label: "Administrator" },
    { value: "src", label: "SRC responder" },
  ],
  approval_status: [
    { value: "pending", label: "Awaiting review" },
    { value: "approved", label: "Approve and publish" },
    { value: "rejected", label: "Reject submission" },
  ],
};

const resourceFieldOptions: Record<string, Record<string, LookupOption[]>> = {
  past_papers: {
    paper_type: ["Paper 1", "Paper 2"].map((value) => ({ value, label: value })),
    exam_type: ["Test 1", "Test 2", "Test 3", "Assignment 1", "Assignment 2", "ISAT", "Internal exam", "Final exam"]
      .flatMap((value) => [value, `${value} (memo)`])
      .map((value) => ({ value, label: value })),
  },
  lecturer_applications: {
    status: [
      { value: "pending", label: "Awaiting review" },
      { value: "approved", label: "Approve lecturer" },
      { value: "rejected", label: "Reject application" },
    ],
  },
  career_opportunities: {
    category: ["Internship", "Learnership", "Part time", "Remote", "Full time"]
      .map((value) => ({ value, label: value })),
  },
  events: {
    category: ["Campus life", "Academic", "Sports", "Arts and culture", "Career", "SRC", "Wellness"]
      .map((value) => ({ value, label: value })),
  },
  accommodations: {
    room_type: ["Single room", "Shared room", "Bachelor unit", "One-bedroom unit", "Residence room"]
      .map((value) => ({ value, label: value })),
  },
};

const statusByResource: Record<string, string[]> = {
  reports: ["open", "reviewing", "dismissed", "content_removed"],
  chat_reports: ["open", "reviewing", "resolved", "dismissed"],
  group_reports: ["open", "reviewing", "resolved", "dismissed"],
  marketplace_reports: ["open", "reviewing", "resolved", "dismissed"],
  module_invitations: ["pending", "accepted", "declined", "expired", "revoked"],
  student_module_registrations: ["active", "completed", "withdrawn"],
  online_classes: ["scheduled", "live", "ended", "cancelled"],
  assignment_submissions: ["draft", "submitted", "late", "graded", "withdrawn"],
  products: ["available", "reserved", "sold", "archived"],
  career_applications: ["submitted", "reviewing", "shortlisted", "accepted", "rejected", "withdrawn"],
  lost_and_found_items: ["open", "matched", "claimed", "closed"],
  lost_and_found_claims: ["pending", "approved", "rejected", "collected"],
  sos_incidents: ["active", "acknowledged", "responding", "resolved", "cancelled"],
  events: ["scheduled", "postponed", "cancelled", "completed"],
  accommodation_reports: ["open", "reviewing", "resolved", "dismissed"],
};

export function optionsFor(resourceKey: string, field: string, lookups: LookupCatalog): LookupOption[] {
  const resourceOptions = resourceFieldOptions[resourceKey]?.[field];
  if (resourceOptions) return resourceOptions;
  const relation = relationLookups[field];
  if (relation) return lookups[relation] ?? [];
  if (field === "status" && statusByResource[resourceKey]) {
    return statusByResource[resourceKey].map((value) => ({ value, label: humanise(value) }));
  }
  if (field === "level") return lookups.levels ?? [];
  if (field === "campus") return lookups.campuses ?? [];
  if (field === "course") return lookups.courses ?? [];
  if (field === "faculty") return lookups.faculties ?? [];
  if (field === "programme") return lookups.programme_names ?? [];
  return enumOptions[field] ?? [];
}

export const resourceColumns: Record<string, string[]> = {
  profiles: ["nickname", "email", "role", "campus", "course", "account_status"],
  lecturer_applications: ["user_id", "programme_id", "requested_module_ids", "status", "created_at"],
  programmes: ["name", "created_at"],
  modules: ["code", "name", "programme_id", "level", "created_at"],
  module_lecturers: ["module_id", "lecturer_id", "created_at"],
  module_invitations: ["module_id", "lecturer_id", "invited_email", "status", "expires_at"],
  student_module_registrations: ["student_id", "module_id", "academic_year", "semester", "status"],
  past_papers: ["paper_type", "module_id", "level", "year", "exam_type", "created_at"],
  lecture_slides: ["title", "module_id", "level", "created_at"],
  timetables: ["title", "programme", "level", "group_name", "created_at"],
  online_classes: ["topic", "module_id", "lecturer_id", "scheduled_at", "status"],
  assessment_briefs: ["title", "module_id", "lecturer_id", "due_at", "published"],
  assignment_submissions: ["title", "student_id", "module_id", "status", "submitted_at", "grade"],
  quizzes: ["title", "module_id", "lecturer_id", "difficulty", "available_from", "published"],
  quiz_questions: ["quiz_id", "question_text", "points", "position", "created_at"],
  quiz_attempts: ["quiz_id", "user_id", "attempt_number", "status", "percentage", "passed"],
  icass_marks: ["student_id", "module_id", "component_name", "component_score", "mark_status", "published"],
  app_takeover_notices: ["title", "notice_kind", "is_blocking", "is_active", "starts_at", "ends_at"],
  events: ["title", "venue", "campus", "date", "category", "approval_status", "published"],
  accommodations: ["title", "campus", "monthly_price", "room_type", "nsfas_accredited", "verified_landlord", "is_active"],
  accommodation_reports: ["accommodation_id", "reporter_id", "reason", "status", "created_at"],
  group_chats: ["name", "visibility", "category", "member_count", "created_at"],
  products: ["title", "price", "category", "condition", "status", "created_at"],
  career_opportunities: ["title", "company", "category", "location", "closing_at", "is_published"],
  sos_incidents: ["emergency_type", "campus", "status", "created_at", "resolved_at"],
  safety_responders: ["user_id", "responder_type", "campus", "active", "created_at"],
  admin_audit_logs: ["actor_name", "actor_email", "actor_role", "category", "action", "target_label", "outcome", "created_at"],
  admin_login_events: ["email", "ip_address", "user_agent", "signed_in_at", "last_seen_at"],
};

export const uploadDefinitions: Record<string, UploadDefinition[]> = {
  past_papers: [{ key: "document", label: "Past paper PDF", helper: "Upload the approved PDF. Its secure storage path is assigned automatically.", accept: "application/pdf" }],
  lecture_slides: [{ key: "document", label: "Lecture slides PDF", helper: "Upload the approved slides as a PDF.", accept: "application/pdf" }],
  timetables: [{ key: "document", label: "Timetable PDF", helper: "Upload the official timetable PDF.", accept: "application/pdf" }],
  assessment_briefs: [{ key: "attachment", label: "Assessment attachment", helper: "Optional supporting PDF for students.", accept: "application/pdf" }],
  quizzes: [{ key: "attachment", label: "Quiz supporting file", helper: "Optional approved reference PDF.", accept: "application/pdf" }],
  quiz_questions: [{ key: "attachment", label: "Question attachment", helper: "Optional diagram or supporting PDF.", accept: "application/pdf" }],
  events: [{ key: "image", label: "Event cover image", helper: "Choose a clear JPG, PNG, WebP or GIF.", accept: "image/jpeg,image/png,image/webp,image/gif" }],
  accommodations: [{ key: "images", label: "Property gallery", helper: "Upload up to 8 clear, current property photos.", accept: "image/jpeg,image/png,image/webp", multiple: true, maxFiles: 8 }],
  group_chats: [
    { key: "avatar", label: "Group avatar", helper: "Square images work best.", accept: "image/jpeg,image/png,image/webp,image/gif" },
    { key: "banner", label: "Group banner", helper: "Use a wide image for the group header.", accept: "image/jpeg,image/png,image/webp,image/gif" },
  ],
  products: [{ key: "image", label: "Listing image", helper: "Replace the listing’s primary product image.", accept: "image/jpeg,image/png,image/webp" }],
};

export const hiddenEditorFields = new Set([
  "url", "storage_path", "image_url", "image_urls", "avatar_url", "banner_url", "images", "image_paths",
  "attachment_storage_path", "attachment_file_name", "attachment_mime_type", "attachment_file_size_bytes",
]);

export const numberFields = new Set([
  "academic_year", "semester", "year", "duration_minutes", "passing_score", "max_attempts", "reward_points",
  "points", "position", "correct_option", "capacity", "sort_order", "component_score", "component_weight",
  "weight_percent", "price", "amount",
  "distance_km", "monthly_price", "available_spaces",
]);

export const requiredFieldsByResource: Record<string, string[]> = {
  past_papers: ["module_id", "exam_type", "paper_type", "year"],
  lecture_slides: ["title", "module_id"],
  timetables: ["title", "module_id"],
  modules: ["name", "programme_id", "level"],
  events: ["title", "venue", "date"],
  accommodations: ["title", "address", "monthly_price", "room_type", "contact_name", "contact_phone"],
  career_opportunities: ["title", "category"],
  safety_responders: ["user_id", "responder_type"],
};

export function humanise(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function displayFieldLabel(field: string) {
  return fieldLabels[field] ?? humanise(field.replace(/_id$/, ""));
}

export function isDateTimeField(field: string) {
  return field.endsWith("_at") || ["date", "end_date", "closing_at", "quiz_date"].includes(field);
}

export function isDateField(field: string) {
  return field.endsWith("_date") && !field.endsWith("_at") || field.endsWith("_on") || field === "assessment_date";
}

export function isLongField(field: string) {
  return ["description", "message", "body", "instructions", "content", "requirements", "amenities", "details", "rules", "feedback", "cover_note", "summary"].includes(field);
}

export function lookupLabel(field: string, value: unknown, lookups: LookupCatalog) {
  const options = optionsFor("", field, lookups);
  return options.find((item) => item.value === String(value ?? ""))?.label;
}
