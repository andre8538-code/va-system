// src/lib/actions.ts
// Next.js Server Actions – anropas direkt från formulär
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { ProjectType, ProjectStatus, ContactRole, CasePriority, CaseStatus } from "./supabase/types";

// ─── helpers ─────────────────────────────────────────────────
function str(v: FormDataEntryValue | null): string {
  return (v as string | null)?.trim() ?? "";
}
function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = str(v);
  return s === "" ? null : s;
}

// ─── AUTH CHECK ───────────────────────────────────────────────
async function requireAdmin() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (p?.role !== "admin") redirect("/portal");
  return { sb, user };
}

// ═══════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════

export async function createProjectAction(formData: FormData) {
  const { sb } = await requireAdmin();
  const { data, error } = await sb.from("projects").insert({
    name:        str(formData.get("name")),
    type:        str(formData.get("type"))   as ProjectType,
    status:      str(formData.get("status")) as ProjectStatus,
    client:      str(formData.get("client")),
    description: strOrNull(formData.get("description")),
    deadline:    strOrNull(formData.get("deadline")),
  }).select().single();
  if (error) throw new Error(error.message);

  // Create initial milestones if provided
  const milestones = str(formData.get("milestones"));
  if (milestones) {
    const lines = milestones.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length) {
      await sb.from("milestones").insert(
        lines.map((label, i) => ({ project_id: data.id, label, sort_order: i + 1 }))
      );
    }
  }

  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function updateProjectAction(id: string, formData: FormData) {
  const { sb } = await requireAdmin();
  const { error } = await sb.from("projects").update({
    name:        str(formData.get("name")),
    type:        str(formData.get("type"))   as ProjectType,
    status:      str(formData.get("status")) as ProjectStatus,
    client:      str(formData.get("client")),
    description: strOrNull(formData.get("description")),
    deadline:    strOrNull(formData.get("deadline")),
  }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  redirect(`/projects/${id}`);
}

export async function deleteProjectAction(id: string) {
  const { sb } = await requireAdmin();
  const { error } = await sb.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
  redirect("/projects");
}

export async function toggleMilestoneAction(id: string, done: boolean, projectId: string) {
  const { sb } = await requireAdmin();
  await sb.from("milestones").update({ done }).eq("id", id);
  revalidatePath(`/projects/${projectId}`);
}

// ═══════════════════════════════════════════════════════════════
// CONTACTS
// ═══════════════════════════════════════════════════════════════

export async function createContactAction(formData: FormData) {
  const { sb } = await requireAdmin();
  const projectId = strOrNull(formData.get("projectId"));

  const { data, error } = await sb.from("contacts").insert({
    name:    str(formData.get("name")),
    role:    str(formData.get("role")) as ContactRole,
    email:   strOrNull(formData.get("email")),
    phone:   strOrNull(formData.get("phone")),
    company: strOrNull(formData.get("company")),
    notes:   strOrNull(formData.get("notes")),
  }).select().single();
  if (error) throw new Error(error.message);

  // Link to project if provided
  if (projectId) {
    await sb.from("project_contacts").insert({ project_id: projectId, contact_id: data.id });
    revalidatePath(`/projects/${projectId}`);
    redirect(`/projects/${projectId}`);
  }

  revalidatePath("/contacts");
  redirect(`/contacts/${data.id}`);
}

export async function updateContactAction(id: string, formData: FormData) {
  const { sb } = await requireAdmin();
  const { error } = await sb.from("contacts").update({
    name:    str(formData.get("name")),
    role:    str(formData.get("role")) as ContactRole,
    email:   strOrNull(formData.get("email")),
    phone:   strOrNull(formData.get("phone")),
    company: strOrNull(formData.get("company")),
    notes:   strOrNull(formData.get("notes")),
  }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
  redirect(`/contacts/${id}`);
}

export async function deleteContactAction(id: string) {
  const { sb } = await requireAdmin();
  await sb.from("contacts").delete().eq("id", id);
  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function linkContactToProjectAction(contactId: string, projectId: string) {
  const { sb } = await requireAdmin();
  await sb.from("project_contacts")
    .upsert({ project_id: projectId, contact_id: contactId });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/contacts/${contactId}`);
}

export async function unlinkContactFromProjectAction(contactId: string, projectId: string) {
  const { sb } = await requireAdmin();
  await sb.from("project_contacts")
    .delete().eq("project_id", projectId).eq("contact_id", contactId);
  revalidatePath(`/projects/${projectId}`);
}

// ═══════════════════════════════════════════════════════════════
// CASES
// ═══════════════════════════════════════════════════════════════

export async function createCaseAction(formData: FormData) {
  const { sb } = await requireAdmin();
  const projectId = str(formData.get("projectId"));
  const { data, error } = await sb.from("cases").insert({
    project_id:  projectId,
    contact_id:  strOrNull(formData.get("contactId")),
    title:       str(formData.get("title")),
    description: strOrNull(formData.get("description")),
    priority:    str(formData.get("priority")) as CasePriority,
    status:      str(formData.get("status"))   as CaseStatus,
    deadline:    strOrNull(formData.get("deadline")),
    assigned_to: strOrNull(formData.get("assignedTo")),
  }).select().single();
  if (error) throw new Error(error.message);

  revalidatePath("/cases");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/cases/${data.id}`);
}

export async function updateCaseAction(id: string, formData: FormData) {
  const { sb } = await requireAdmin();
  const { data: existing } = await sb.from("cases").select("project_id").eq("id", id).single();
  const { error } = await sb.from("cases").update({
    contact_id:  strOrNull(formData.get("contactId")),
    title:       str(formData.get("title")),
    description: strOrNull(formData.get("description")),
    priority:    str(formData.get("priority")) as CasePriority,
    status:      str(formData.get("status"))   as CaseStatus,
    deadline:    strOrNull(formData.get("deadline")),
    assigned_to: strOrNull(formData.get("assignedTo")),
  }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/cases/${id}`);
  revalidatePath("/cases");
  if (existing?.project_id) revalidatePath(`/projects/${existing.project_id}`);
  redirect(`/cases/${id}`);
}

export async function deleteCaseAction(id: string, projectId: string) {
  const { sb } = await requireAdmin();
  await sb.from("cases").delete().eq("id", id);
  revalidatePath("/cases");
  revalidatePath(`/projects/${projectId}`);
  redirect("/cases");
}

export async function updateCaseStatusAction(id: string, status: CaseStatus, projectId: string) {
  const { sb } = await requireAdmin();
  await sb.from("cases").update({ status }).eq("id", id);
  revalidatePath(`/cases/${id}`);
  revalidatePath(`/projects/${projectId}`);
}

// ═══════════════════════════════════════════════════════════════
// PORTAL ACCESS – INVITE
// ═══════════════════════════════════════════════════════════════

export async function generateInviteAction(contactId: string, projectId: string) {
  const { sb } = await requireAdmin();
  // Upsert – om det redan finns en inbjudan, returnera den
  const { data, error } = await sb.from("portal_access")
    .upsert({ contact_id: contactId, project_id: projectId }, { onConflict: "contact_id,project_id" })
    .select("invite_token")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/contacts/${contactId}`);
  return data.invite_token as string;
}

// ═══════════════════════════════════════════════════════════════
// EMAIL LINKS
// ═══════════════════════════════════════════════════════════════

export async function linkEmailAction(formData: FormData) {
  const { sb } = await requireAdmin();
  await sb.from("email_links").upsert({
    gmail_thread_id: str(formData.get("threadId")),
    project_id:      str(formData.get("projectId")),
    case_id:         strOrNull(formData.get("caseId")),
    subject:         strOrNull(formData.get("subject")),
    from_address:    strOrNull(formData.get("from")),
    snippet:         strOrNull(formData.get("snippet")),
    note:            strOrNull(formData.get("note")),
  }, { onConflict: "gmail_thread_id,project_id" });

  const projectId = str(formData.get("projectId"));
  revalidatePath(`/projects/${projectId}`);
}
