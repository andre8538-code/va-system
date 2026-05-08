// src/lib/supabase/types.ts
export type ProjectType   = "VA-utredning" | "Besiktning" | "Rådgivning" | "Tillstånd";
export type ProjectStatus = "Förfrågan" | "Aktiv" | "Granskning" | "Avslutat";
export type ContactRole   = "Fastighetsägare" | "Entreprenör" | "Samfällighet" | "Företag";
export type CasePriority  = "Hög" | "Medium" | "Låg";
export type CaseStatus    = "Öppen" | "Pågående" | "Stängd";

export interface Project {
  id: string; name: string; type: ProjectType; status: ProjectStatus;
  client: string; description: string | null; deadline: string | null;
  created_at: string; updated_at: string;
  contacts?: Contact[]; cases?: Case[]; milestones?: Milestone[];
}
export interface Milestone {
  id: string; project_id: string; label: string;
  due_date: string | null; done: boolean; sort_order: number;
}
export interface Contact {
  id: string; name: string; role: ContactRole;
  email: string | null; phone: string | null; company: string | null; notes: string | null;
}
export interface Case {
  id: string; project_id: string; contact_id: string | null;
  title: string; description: string | null; priority: CasePriority;
  status: CaseStatus; assigned_to: string | null; deadline: string | null;
  created_at: string; updated_at: string;
  contact?: Contact; project?: Pick<Project, "id" | "name">;
}
export interface Document {
  id: string; project_id: string; name: string; storage_path: string;
  mime_type: string | null; size_bytes: number | null; category: string | null;
  uploaded_by_name: string | null; source: "portal" | "onedrive"; created_at: string;
}
export interface EmailLink {
  id: string; gmail_thread_id: string; project_id: string; case_id: string | null;
  subject: string | null; from_address: string | null; snippet: string | null;
  note: string | null; created_at: string;
}
export interface Message {
  id: string; project_id: string; sender_name: string;
  sender_role: "admin" | "customer"; body: string; created_at: string;
}
export interface PortalAccess {
  id: string; contact_id: string; user_id: string | null; project_id: string;
  invite_token: string; accepted_at: string | null;
  contact?: Contact; project?: Pick<Project, "id" | "name">;
}
export interface UserProfile {
  id: string; full_name: string | null; role: "admin" | "customer"; created_at: string;
}
