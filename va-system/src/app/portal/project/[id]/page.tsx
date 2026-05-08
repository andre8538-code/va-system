// src/app/portal/project/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

const STATUS_CFG: Record<string, { bg: string; color: string; dot: string }> = {
  "Förfrågan":  { bg: "#F0EEE9", color: "#5A5850", dot: "#9A9888" },
  "Aktiv":      { bg: "#E6F3F1", color: "#0D6B5E", dot: "#1A8C7C" },
  "Granskning": { bg: "#FDF4E6", color: "#C47A1A", dot: "#C47A1A" },
  "Avslutat":   { bg: "#E8F5EE", color: "#2A7A50", dot: "#2A7A50" },
};

export default async function PortalOverviewPage({ params }: { params: { id: string } }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  const [{ data: project }, { data: milestones }, { data: cases }, { data: consultant }] = await Promise.all([
    sb.from("projects").select("*").eq("id", params.id).single(),
    sb.from("milestones").select("*").eq("project_id", params.id).order("sort_order"),
    sb.from("cases").select("id, title, status, priority, assigned_to")
      .eq("project_id", params.id).neq("status", "Stängd"),
    sb.from("profiles").select("full_name").eq("role", "admin").limit(1).single(),
  ]);

  if (!project) notFound();

  const done     = milestones?.filter(m => m.done).length ?? 0;
  const total    = milestones?.length ?? 0;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const cfg      = STATUS_CFG[project.status] ?? STATUS_CFG["Aktiv"];

  const customerCases = cases?.filter(c => c.assigned_to === "Fastighetsägare") ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-display text-xl font-bold text-[#1C1A16] mb-1">{project.name}</h1>
          <p className="text-sm text-[#7E7A6F]">{project.client}</p>
        </div>
        <span className="badge text-[11px]" style={{ background: cfg.bg, color: cfg.color }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: cfg.dot }} />
          {project.status}
        </span>
      </div>

      {/* Action required */}
      {customerCases.length > 0 && (
        <div className="bg-[#FDF4E6] border border-[#C47A1A]/25 rounded-2xl p-4">
          <p className="text-sm font-bold text-[#C47A1A] mb-2">⚡ Kräver din åtgärd</p>
          {customerCases.map(c => (
            <Link key={c.id} href={`/portal/project/${params.id}/cases`}
              className="block text-sm text-[#1C1A16] hover:text-[#0D6B5E] py-0.5">
              → {c.title}
            </Link>
          ))}
        </div>
      )}

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-[#E4E0D8] p-6">
        <div className="flex justify-between items-center mb-3">
          <p className="font-bold text-[#1C1A16]">Projektframsteg</p>
          <span className="font-display text-2xl font-bold text-[#0D6B5E]">{progress}%</span>
        </div>
        <div className="h-2 bg-[#E4E0D8] rounded-full overflow-hidden mb-6">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg,#0D6B5E,#1A8C7C)" }} />
        </div>

        <div className="space-y-3">
          {milestones?.map((m, i) => {
            const isNext = !m.done && milestones.findIndex(x => !x.done) === i;
            return (
              <div key={m.id} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0
                  ${m.done ? "bg-[#0D6B5E] border-[#0D6B5E] text-white" : "bg-white border-[#E4E0D8] text-[#C5C0B8]"}`}>
                  {m.done ? "✓" : i + 1}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${m.done ? "line-through text-[#A8A49A]" : "font-medium text-[#1C1A16]"}`}>{m.label}</p>
                  {m.due_date && <p className="text-xs text-[#A8A49A]">{m.due_date}</p>}
                </div>
                {isNext && (
                  <span className="text-[10px] font-bold bg-[#E6F3F1] text-[#0D6B5E] px-2.5 py-1 rounded-full">PÅGÅR</span>
                )}
              </div>
            );
          })}
          {total === 0 && <p className="text-sm text-[#A8A49A] text-center py-2">Inga milstolpar tillagda ännu.</p>}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E4E0D8] p-5">
          <p className="text-[11px] font-bold text-[#A8A49A] uppercase tracking-wider mb-3">Projektinfo</p>
          {[["Typ", project.type], ["Start", project.created_at?.slice(0, 10)], ["Deadline", project.deadline ?? "–"]].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-2 border-b border-[#F0EDE8] last:border-0">
              <span className="text-[#7E7A6F]">{k}</span>
              <span className="font-medium text-[#1C1A16]">{v}</span>
            </div>
          ))}
        </div>
        <div className="bg-[#E6F3F1] border border-[#0D6B5E]/15 rounded-2xl p-5">
          <p className="text-[11px] font-bold text-[#0D6B5E] uppercase tracking-wider mb-3">Din konsult</p>
          <p className="font-bold text-[#1C1A16] mb-1">{consultant?.full_name ?? "VA Konsult"}</p>
          <Link href={`/portal/project/${params.id}/messages`}
            className="inline-block mt-2 text-xs font-semibold text-[#0D6B5E] bg-white/70 px-3 py-1.5 rounded-lg hover:bg-white transition-colors">
            ✉ Skicka meddelande
          </Link>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="bg-white rounded-2xl border border-[#E4E0D8] p-5">
          <p className="text-[11px] font-bold text-[#A8A49A] uppercase tracking-wider mb-2">Om projektet</p>
          <p className="text-sm text-[#5A5650] leading-relaxed">{project.description}</p>
        </div>
      )}
    </div>
  );
}
