// src/app/(admin)/projects/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getProjects, getCases } from "@/lib/supabase/queries";
export const metadata: Metadata = { title: "Projekt" };
const TYPE_ICON: Record<string, string> = {
  "VA-utredning": "🔍", "Besiktning": "🔎", "Rådgivning": "💬", "Tillstånd": "📋",
};
const STATUS_CFG: Record<string, { bg: string; color: string; dot: string }> = {
  "Förfrågan":  { bg: "#F0EEE9", color: "#5A5850", dot: "#9A9888" },
  "Aktiv":      { bg: "#E8EEF7", color: "#3A6DB5", dot: "#3A6DB5" },
  "Granskning": { bg: "#FDF0E4", color: "#B5620A", dot: "#B5620A" },
  "Avslutat":   { bg: "#E6F4EC", color: "#2D7A4F", dot: "#2D7A4F" },
};
export default async function ProjectsPage() {
  const [projects, cases] = await Promise.all([getProjects(), getCases()]);
  return (
    <div className="p-4 sm:p-9 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="page-title">Projekt</h1>
        <Link href="/projects/new" className="btn-primary self-start sm:self-auto">+ Nytt projekt</Link>
      </div>
      <div className="space-y-2.5">
        {projects.map(p => {
          const pCases  = cases.filter(c => c.project_id === p.id && c.status !== "Stängd");
          const cfg     = STATUS_CFG[p.status] ?? STATUS_CFG["Förfrågan"];
          const overdue = p.deadline && new Date(p.deadline) < new Date() && p.status !== "Avslutat";
          return (
            <Link key={p.id} href={`/projects/${p.id}`}
              className="card flex justify-between items-center gap-4 hover:shadow-md hover:-translate-y-px transition-all cursor-pointer block">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="text-base">{TYPE_ICON[p.type] ?? "📁"}</span>
                  <span className="font-bold text-[15px] text-[#1A1916] truncate">{p.name}</span>
                  {overdue && <span className="badge bg-[#FAE8E8] text-[#B52A2A] text-[10px]">FÖRSENAD</span>}
                </div>
                <p className="text-sm text-[#7A7870] mb-2.5">{p.client}</p>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: cfg.dot }} />
                    {p.status}
                  </span>
                  <span className="badge bg-[#F0EEE9] text-[#5A5850]">{p.type}</span>
                  {pCases.length > 0 && (
                    <span className="badge bg-[#E8EEF7] text-[#3A6DB5]">{pCases.length} öppna ärenden</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                {p.deadline && (
                  <p className={`text-xs mb-1 ${overdue ? "text-[#B52A2A] font-semibold" : "text-[#7A7870]"}`}>
                    📅 {p.deadline}
                  </p>
                )}
                <p className="text-xs text-[#7A7870]">{p.contacts?.length ?? 0} kontakter</p>
              </div>
            </Link>
          );
        })}
        {projects.length === 0 && (
          <div className="card text-center py-12 text-[#7A7870]">
            Inga projekt ännu.{" "}
            <Link href="/projects/new" className="text-[#1E4D8C] hover:underline">Skapa ditt första →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
