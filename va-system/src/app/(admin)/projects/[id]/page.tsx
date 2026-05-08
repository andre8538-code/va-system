// src/app/(admin)/projects/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getCases, getDocuments } from "@/lib/supabase/queries";

export const metadata: Metadata = { title: "Projekt" };

const ROLE_CFG: Record<string, { bg: string; color: string }> = {
  "Fastighetsägare": { bg: "#EEF2FF", color: "#3730A3" },
  "Entreprenör":     { bg: "#FEF3C7", color: "#92400E" },
  "Samfällighet":    { bg: "#DCFCE7", color: "#166534" },
  "Företag":         { bg: "#FCE7F3", color: "#9D174D" },
};
const STATUS_CFG: Record<string, { bg: string; color: string; dot: string }> = {
  "Förfrågan":  { bg: "#F0EEE9", color: "#5A5850", dot: "#9A9888" },
  "Aktiv":      { bg: "#E8EEF7", color: "#3A6DB5", dot: "#3A6DB5" },
  "Granskning": { bg: "#FDF0E4", color: "#B5620A", dot: "#B5620A" },
  "Avslutat":   { bg: "#E6F4EC", color: "#2D7A4F", dot: "#2D7A4F" },
};
const PRIO_CFG: Record<string, { bg: string; color: string }> = {
  "Hög":    { bg: "#FAE8E8", color: "#B52A2A" },
  "Medium": { bg: "#FDF0E4", color: "#B5620A" },
  "Låg":    { bg: "#F0EEE9", color: "#7A7870" },
};
const FILE_ICON: Record<string, string> = { pdf: "📄", dwg: "📐", docx: "📝", xlsx: "📊", default: "📎" };

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const [project, cases, documents] = await Promise.all([
    getProject(params.id),
    getCases({ projectId: params.id }),
    getDocuments(params.id),
  ]);

  if (!project) notFound();

  const statusCfg = STATUS_CFG[project.status] ?? STATUS_CFG["Förfrågan"];
  const milestones = project.milestones ?? [];
  const doneMilestones = milestones.filter(m => m.done).length;
  const progress = milestones.length ? Math.round((doneMilestones / milestones.length) * 100) : 0;

  return (
    <div className="p-9 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#7A7870] mb-5">
        <Link href="/projects" className="hover:text-[#1E4D8C] transition-colors">Projekt</Link>
        <span>/</span>
        <span className="text-[#1A1916] font-medium truncate">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="page-title mb-1">{project.name}</h1>
          <p className="text-sm text-[#7A7870]">{project.client}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge" style={{ background: statusCfg.bg, color: statusCfg.color }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: statusCfg.dot }} />
            {project.status}
          </span>
          <Link href={`/projects/${project.id}/edit`} className="btn-secondary text-xs px-3 py-1.5">Redigera</Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Progress + milestones */}
        <div className="card col-span-2">
          <div className="flex justify-between items-center mb-3">
            <p className="section-title">Framsteg</p>
            <span className="font-display text-2xl font-bold text-[#1E4D8C]">{progress}%</span>
          </div>
          <div className="h-2 bg-[#E8E5DF] rounded-full mb-5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1E4D8C] to-[#3A6DB5] transition-all duration-700"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="space-y-3">
            {milestones.sort((a, b) => a.sort_order - b.sort_order).map((m, i) => (
              <div key={m.id} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2
                  ${m.done ? "bg-[#1E4D8C] border-[#1E4D8C] text-white" : "bg-white border-[#DDDBD6] text-[#B0ACA4]"}`}>
                  {m.done ? "✓" : i + 1}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${m.done ? "line-through text-[#7A7870]" : "font-medium text-[#1A1916]"}`}>{m.label}</p>
                  {m.due_date && <p className="text-xs text-[#A8A49A]">{m.due_date}</p>}
                </div>
                {!m.done && i === milestones.findIndex(x => !x.done) && (
                  <span className="badge bg-[#E8EEF7] text-[#3A6DB5] text-[10px]">PÅGÅR</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-3">
          <div className="card">
            <p className="text-[11px] font-bold text-[#7A7870] uppercase tracking-wider mb-3">Projektinfo</p>
            {[["Typ", project.type], ["Deadline", project.deadline ?? "–"], ["Skapad", project.created_at.slice(0, 10)]].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1.5 border-b border-[#E8E5DF] last:border-0">
                <span className="text-[#7A7870]">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <p className="text-[11px] font-bold text-[#7A7870] uppercase tracking-wider mb-3">Kontakter</p>
            {(project.contacts ?? []).map(c => (
              <div key={c.id} className="flex justify-between items-center py-1.5 border-b border-[#E8E5DF] last:border-0">
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-[#7A7870]">{c.email}</p>
                </div>
                <span className="badge text-[10px]" style={ROLE_CFG[c.role] ?? {}}>{c.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cases */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <p className="section-title">Ärenden ({cases.length})</p>
          <Link href={`/cases/new?project=${project.id}`} className="btn-primary text-xs px-3 py-1.5">+ Nytt ärende</Link>
        </div>
        <div className="space-y-2">
          {cases.map(c => (
            <Link key={c.id} href={`/cases/${c.id}`}
              className="card flex justify-between items-start gap-4 hover:shadow-md hover:-translate-y-px transition-all block">
              <div className="flex-1">
                <p className="font-semibold text-sm mb-1.5">{c.title}</p>
                <p className="text-xs text-[#7A7870] mb-2">{c.description}</p>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="badge text-[10px]" style={PRIO_CFG[c.priority]??{}}>{c.priority}</span>
                  {c.contact && <span className="badge bg-[#F0EEE9] text-[#5A5850] text-[10px]">{c.contact.name}</span>}
                </div>
              </div>
              <p className="text-xs text-[#7A7870] shrink-0">📅 {c.deadline}</p>
            </Link>
          ))}
          {cases.length === 0 && <p className="text-sm text-[#7A7870] text-center py-6">Inga ärenden på detta projekt.</p>}
        </div>
      </div>

      {/* Documents */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <p className="section-title">Dokument ({documents.length})</p>
          <Link href={`/documents?project=${project.id}`} className="btn-secondary text-xs px-3 py-1.5">Hantera filer</Link>
        </div>
        <div className="space-y-1.5">
          {documents.slice(0, 4).map(d => (
            <div key={d.id} className="flex items-center justify-between bg-white border border-[#DDDBD6] rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{FILE_ICON[d.mime_type?.split("/")[1] ?? ""] ?? FILE_ICON.default}</span>
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-[#7A7870]">{d.uploaded_by_name} · {d.created_at.slice(0, 10)}</p>
                </div>
              </div>
              <button className="text-xs text-[#1E4D8C] hover:underline">↓ Ladda ner</button>
            </div>
          ))}
          {documents.length === 0 && <p className="text-sm text-[#7A7870] text-center py-4">Inga dokument uppladdade.</p>}
        </div>
      </div>
    </div>
  );
}
