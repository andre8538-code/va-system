// src/app/portal/project/[id]/layout.tsx
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortalNav from "./PortalNav";

export default async function ProjectPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/portal/login");

  // Verify access
  const { data: access } = await sb
    .from("portal_access")
    .select("id, projects(id, name, type, status, deadline, client)")
    .eq("user_id", user.id)
    .eq("project_id", params.id)
    .not("accepted_at", "is", null)
    .single();

  if (!access) notFound();

  const project = access.projects as any;

  // Get user's contact name
  const { data: contactRow } = await sb
    .from("portal_access")
    .select("contacts(name)")
    .eq("user_id", user.id)
    .eq("project_id", params.id)
    .single();
  const contactName = (contactRow?.contacts as any)?.name ?? user.email ?? "Kund";

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Top bar */}
      <header className="bg-white border-b border-[#E4E0D8] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-[#0D6B5E] tracking-[0.1em] uppercase">VA Konsult</span>
            <span className="text-[#E4E0D8]">|</span>
            <span className="text-sm text-[#7E7A6F] truncate max-w-[220px]">{project.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#7E7A6F] hidden sm:block">{contactName}</span>
            <a href="/portal" className="text-xs text-[#A8A49A] hover:text-[#0D6B5E] transition-colors">← Mina projekt</a>
          </div>
        </div>
        <PortalNav projectId={params.id} />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
