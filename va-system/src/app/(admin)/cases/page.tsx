// src/app/(admin)/cases/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getCases } from "@/lib/supabase/queries";

export const metadata: Metadata = { title: "Ärenden" };

const PRIO: Record<string, { bg: string; color: string }> = {
  "Hög":    { bg: "#FAE8E8", color: "#B52A2A" },
  "Medium": { bg: "#FDF0E4", color: "#B5620A" },
  "Låg":    { bg: "#F0EEE9", color: "#7A7870" },
};
const STATUS: Record<string, { bg: string; color: string }> = {
  "Öppen":    { bg: "#E8EEF7", color: "#3A6DB5" },
  "Pågående": { bg: "#FDF0E4", color: "#B5620A" },
  "Stängd":   { bg: "#E6F4EC", color: "#2D7A4F" },
};

export default async function CasesPage() {
  const cases = await getCases();

  return (
    <div className="p-9 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Ärenden</h1>
        <Link href="/cases/new" className="btn-primary">+ Nytt ärende</Link>
      </div>

      <div className="space-y-2">
        {cases.map(c => {
          const overdue = c.deadline && new Date(c.deadline) < new Date() && c.status !== "Stängd";
          return (
            <Link key={c.id} href={`/cases/${c.id}`}
              className="card flex justify-between items-start gap-4 hover:shadow-md hover:-translate-y-px transition-all block">
              <div className="flex-1">
                <p className="font-bold text-[15px] mb-1">{c.title}</p>
                {c.project && <p className="text-xs text-[#1E4D8C] mb-2">📁 {c.project.name}</p>}
                <p className="text-sm text-[#7A7870] mb-2.5">{c.description}</p>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="badge text-[10px]" style={STATUS[c.status]??{}}>{c.status}</span>
                  <span className="badge text-[10px]" style={PRIO[c.priority]??{}}>{c.priority}</span>
                  {c.contact && <span className="badge bg-[#F0EEE9] text-[#5A5850] text-[10px]">{c.contact.name}</span>}
                </div>
              </div>
              <p className={`text-xs shrink-0 ${overdue ? "text-[#B52A2A] font-semibold" : "text-[#7A7870]"}`}>
                {overdue ? "⚠ " : "📅 "}{c.deadline}
              </p>
            </Link>
          );
        })}
        {cases.length === 0 && <p className="card text-center py-12 text-[#7A7870]">Inga ärenden ännu.</p>}
      </div>
    </div>
  );
}
