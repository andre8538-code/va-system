// src/app/portal/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PortalIndexPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/portal/login");

  // Get all projects this user has access to
  const { data: access } = await sb
    .from("portal_access")
    .select("project_id, projects(id, name, type, status, deadline, client)")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null);

  const projects = (access ?? [])
    .map(a => a.projects as any)
    .filter(Boolean);

  // Single project → redirect directly
  if (projects.length === 1) redirect(`/portal/project/${projects[0].id}`);

  const STATUS_CFG: Record<string, { bg: string; color: string; dot: string }> = {
    "Förfrågan":  { bg: "#F0EEE9", color: "#5A5850", dot: "#9A9888" },
    "Aktiv":      { bg: "#E6F3F1", color: "#0D6B5E", dot: "#1A8C7C" },
    "Granskning": { bg: "#FDF4E6", color: "#C47A1A", dot: "#C47A1A" },
    "Avslutat":   { bg: "#E8F5EE", color: "#2A7A50", dot: "#2A7A50" },
  };
  const TYPE_ICON: Record<string, string> = {
    "VA-utredning": "🔍", "Besiktning": "🔎", "Rådgivning": "💬", "Tillstånd": "📋",
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <p className="text-[11px] text-[#0D6B5E] font-bold tracking-[0.1em] uppercase mb-2">VA Konsult</p>
          <h1 className="font-display text-2xl font-bold text-[#1C1A16] mb-1">Välkommen</h1>
          <p className="text-sm text-[#7E7A6F]">Välj ett projekt för att fortsätta.</p>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E4E0D8] p-10 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm text-[#7E7A6F]">Du har inte tillgång till några projekt ännu.<br />Kontakta din konsult för en inbjudningslänk.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p: any) => {
              const cfg = STATUS_CFG[p.status] ?? STATUS_CFG["Aktiv"];
              return (
                <Link key={p.id} href={`/portal/project/${p.id}`}
                  className="flex items-center justify-between bg-white rounded-2xl border border-[#E4E0D8] p-5 hover:border-[#0D6B5E] hover:shadow-md transition-all">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-base">{TYPE_ICON[p.type] ?? "📁"}</span>
                      <span className="font-bold text-[15px] text-[#1C1A16]">{p.name}</span>
                    </div>
                    <p className="text-sm text-[#7E7A6F]">{p.client}</p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <span className="badge text-[11px]" style={{ background: cfg.bg, color: cfg.color }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: cfg.dot }} />
                      {p.status}
                    </span>
                    {p.deadline && <p className="text-xs text-[#A8A49A] mt-1">📅 {p.deadline}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <form action="/api/auth/signout" method="POST">
          <button className="w-full mt-6 text-sm text-[#A8A49A] hover:text-[#7E7A6F] transition-colors">
            Logga ut →
          </button>
        </form>
      </div>
    </div>
  );
}
