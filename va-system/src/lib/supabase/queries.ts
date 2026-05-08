// src/lib/supabase/queries.ts
// All database operations – import in Server Components or Route Handlers
import { createClient } from "./server";
import type {
  Project, Contact, Case, Document,
  EmailLink, Message, PortalAccess, Milestone,
} from "./types";

// ─── PROJECTS ────────────────────────────────────────────────
export async function getProjects(): Promise<Project[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("projects")
    .select(`*, milestones(*), project_contacts(contacts(*))`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    ...p,
    contacts: p.project_contacts?.map((pc: any) => pc.contacts).filter(Boolean) ?? [],
  }));
}

export async function getProject(id: string): Promise<Project | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("projects")
    .select(`*, milestones(*), project_contacts(contacts(*)), cases(*, contacts(*))`)
    .eq("id", id)
    .single();
  if (error) return null;
  return {
    ...data,
    contacts: data.project_contacts?.map((pc: any) => pc.contacts).filter(Boolean) ?? [],
  };
}

export async function createProject(input: Omit<Project, "id" | "created_at" | "updated_at">): Promise<Project> {
  const sb = await createClient();
  const { data, error } = await sb.from("projects").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, input: Partial<Project>): Promise<Project> {
  const sb = await createClient();
  const { data, error } = await sb.from("projects").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const sb = await createClient();
  const { error } = await sb.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// ─── CONTACTS ────────────────────────────────────────────────
export async function getContacts(): Promise<Contact[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("contacts").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createContact(input: Omit<Contact, "id">): Promise<Contact> {
  const sb = await createClient();
  const { data, error } = await sb.from("contacts").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateContact(id: string, input: Partial<Contact>): Promise<Contact> {
  const sb = await createClient();
  const { data, error } = await sb.from("contacts").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function linkContactToProject(projectId: string, contactId: string) {
  const sb = await createClient();
  const { error } = await sb.from("project_contacts").insert({ project_id: projectId, contact_id: contactId });
  if (error) throw error;
}

// ─── CASES ───────────────────────────────────────────────────
export async function getCases(filters?: { projectId?: string; status?: string; priority?: string }): Promise<Case[]> {
  const sb = await createClient();
  let q = sb.from("cases").select(`*, contacts(*), projects(id,name)`).order("created_at", { ascending: false });
  if (filters?.projectId) q = q.eq("project_id", filters.projectId);
  if (filters?.status)    q = q.eq("status", filters.status);
  if (filters?.priority)  q = q.eq("priority", filters.priority);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((c: any) => ({ ...c, contact: c.contacts, project: c.projects }));
}

export async function createCase(input: Omit<Case, "id" | "created_at" | "updated_at">): Promise<Case> {
  const sb = await createClient();
  const { data, error } = await sb.from("cases").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateCase(id: string, input: Partial<Case>): Promise<Case> {
  const sb = await createClient();
  const { data, error } = await sb.from("cases").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// ─── DOCUMENTS ───────────────────────────────────────────────
export async function getDocuments(projectId: string): Promise<Document[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("documents").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createDocumentRecord(input: Omit<Document, "id" | "created_at">): Promise<Document> {
  const sb = await createClient();
  const { data, error } = await sb.from("documents").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  const sb = await createClient();
  const { data } = await sb.storage.from("project-documents").createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? "";
}

// ─── EMAIL LINKS ─────────────────────────────────────────────
export async function getEmailLinks(projectId: string): Promise<EmailLink[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("email_links").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertEmailLink(input: {
  gmail_thread_id: string; project_id: string; case_id?: string;
  subject?: string; from_address?: string; snippet?: string; note?: string;
}): Promise<EmailLink> {
  const sb = await createClient();
  const { data, error } = await sb.from("email_links")
    .upsert(input, { onConflict: "gmail_thread_id,project_id" }).select().single();
  if (error) throw error;
  return data;
}

// ─── MESSAGES ────────────────────────────────────────────────
export async function getMessages(projectId: string): Promise<Message[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("messages").select("*").eq("project_id", projectId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(input: { project_id: string; sender_name: string; sender_role: "admin" | "customer"; body: string }): Promise<Message> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { data, error } = await sb.from("messages").insert({ ...input, sender_id: user?.id }).select().single();
  if (error) throw error;
  return data;
}

// ─── PORTAL ACCESS ───────────────────────────────────────────
export async function getPortalAccess(projectId?: string): Promise<PortalAccess[]> {
  const sb = await createClient();
  let q = sb.from("portal_access").select("*, contacts(*), projects(id,name)");
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((pa: any) => ({ ...pa, contact: pa.contacts, project: pa.projects }));
}

export async function acceptInvite(token: string): Promise<void> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await sb.from("portal_access")
    .update({ user_id: user.id, accepted_at: new Date().toISOString() })
    .eq("invite_token", token).is("accepted_at", null);
  if (error) throw error;
  await sb.from("profiles").update({ role: "customer" }).eq("id", user.id);
}

// ─── MILESTONES ──────────────────────────────────────────────
export async function updateMilestone(id: string, input: Partial<Milestone>): Promise<Milestone> {
  const sb = await createClient();
  const { data, error } = await sb.from("milestones").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function createMilestone(input: Omit<Milestone, "id">): Promise<Milestone> {
  const sb = await createClient();
  const { data, error } = await sb.from("milestones").insert(input).select().single();
  if (error) throw error;
  return data;
}

// ─── AUTH ────────────────────────────────────────────────────
export async function getCurrentUser() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).single();
  return { ...user, profile };
}
