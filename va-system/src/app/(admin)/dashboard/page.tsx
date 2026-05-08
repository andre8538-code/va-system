// src/app/(admin)/dashboard/page.tsx
import type { Metadata } from "next";
import { getProjects } from "@/lib/supabase/queries";
import { getCases } from "@/lib/supabase/queries";

export const metadata: Metadata = { title: "Översikt" };

export default async function DashboardPage() {
  const [projects, cases] = await Promise.all([getProjects(), getCases()]);

  const active    = projects.filter(p => p.status === "Aktiv").length;
  const openCases = cases.filter(c => c.status !== "Stängd").length;
  const highPrio  = cases.filter(c => c.priority === "Hög" && c.status !== "Stängd").length;
  const overdue   = projects.filter(p => p.deadline && new Date(p.deadline) < new Date() && p.status !== "Avslutat");

  const STATUS_CFG: Record<string, { dot: string }> = {
    "Förfrågan": { dot: "#9A9888" }, "Aktiv":      { dot: "#3A6DB5" },
    "Granskning":{ dot: "#B5620A" }, "Avslutat":   { dot: "#2D7A4F" },
  };

  return (
    <div className="p-9 max-w-5xl">
      <h1 className="page-title mb-6">Översikt</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        {[
          { label: "Aktiva projekt",  value: active,    sub: `av ${projects.length} totalt`, color: "#1E4D8C" },
          { label: "Öppna ärenden",   value: openCases, sub: "ej stängda",                  color: "#3A6DB5" },
          { label: "Hög prioritet",   value: highPrio,  sub: "kräver åtgärd",               color: "#B52A2A" },
          { label: "Försenade",       value: overdue.length, sub: "projekt",                color: overdue.length > 0 ? "#B52A2A" : "#2D7A4F" },
        ].map(s => (
          <div key={s.label} className="card">
            <p className="text-[11px] font-bold text-[#7A7870] uppercase tracking-wider mb-2">{s.label}</p>
            <p className="font-display text-3xl font-bold leading-none mb-1.5" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[#7A7870]">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Recent cases */}
        <div className="card">
          <p className="section-title mb-4">Senaste ärenden</p>
          {cases.filter(c => c.status !== "Stängd").slice(0, 5).map(c => (
            <div key={c.id} className="flex justify-between items-start py-2.5 border-b border-[#E8E5DF] last:border-0">
              <div>
                <p className="text-sm font-semibold text-[#1A1916]">{c.title}</p>
                <p className="text-xs text-[#7A7870] mt-0.5">{(c as any).project?.name}</p>
              </div>
              <span className="badge ml-3 shrink-0" style={{
                background: c.priority === "Hög" ? "#FAE8E8" : c.priority === "Medium" ? "#FDF0E4" : "#F0EEE9",
                color:      c.priority === "Hög" ? "#B52A2A" : c.priority === "Medium" ? "#B5620A" : "#7A7870",
              }}>{c.priority}</span>
            </div>
          ))}
        </div>

        {/* Project status */}
        <div className="card">
          <p className="section-title mb-4">Projektstatus</p>
          {Object.entries(STATUS_CFG).map(([status, cfg]) => {
            const count = projects.filter(p => p.status === status).length;
            const pct   = projects.length ? (count / projects.length) * 100 : 0;
            return (
              <div key={status} className="mb-3">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-[#1A1916]">{status}</span>
                  <span className="text-[#7A7870]">{count}</span>
                </div>
                <div className="h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cfg.dot }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overdue warning */}
      {overdue.length > 0 && (
        <div className="rounded-xl bg-[#FAE8E8] border border-[#B52A2A]/20 p-4">
          <p className="text-sm font-bold text-[#B52A2A] mb-2">⚠ Försenade projekt</p>
          {overdue.map(p => (
            <p key={p.id} className="text-sm text-[#1A1916]">
              • {p.name} <span className="text-[#B52A2A] text-xs">deadline {p.deadline}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
