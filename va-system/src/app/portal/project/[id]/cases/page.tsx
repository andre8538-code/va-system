// src/app/portal/project/[id]/cases/page.tsx
import { createClient } from "@/lib/supabase/server";

const PRIO: Record<string, { bg: string; color: string }> = {
  "Hög":    { bg: "#FAEAEA", color: "#B83232" },
  "Medium": { bg: "#FDF4E6", color: "#C47A1A" },
  "Låg":    { bg: "#F0EDE8", color: "#8A8680" },
};
const STATUS: Record<string, { bg: string; color: string }> = {
  "Öppen":    { bg: "#E6F3F1", color: "#0D6B5E" },
  "Pågående": { bg: "#FDF4E6", color: "#C47A1A" },
  "Stängd":   { bg: "#E8F5EE", color: "#2A7A50" },
};

export default async function PortalCasesPage({ params }: { params: { id: string } }) {
  const sb = await createClient();
  const { data: cases } = await sb
    .from("cases")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  const open   = cases?.filter(c => c.status !== "Stängd") ?? [];
  const closed = cases?.filter(c => c.status === "Stängd") ?? [];

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-[#1C1A16] mb-6">Ärenden</h1>

      {open.length === 0 && closed.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E4E0D8] p-10 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm text-[#7E7A6F]">Inga öppna ärenden just nu.</p>
        </div>
      )}

      {open.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] font-bold text-[#A8A49A] uppercase tracking-wider mb-3">Öppna ({open.length})</p>
          <div className="space-y-2.5">
            {open.map(c => {
              const customerAction = c.assigned_to === "Fastighetsägare";
              return (
                <details key={c.id} className={`bg-white rounded-2xl border overflow-hidden
                  ${customerAction ? "border-[#C47A1A]/40" : "border-[#E4E0D8]"}`}>
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none
                    hover:bg-[#F7F5F0] transition-colors">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        {customerAction && <span className="text-[10px] font-bold text-[#C47A1A] bg-[#FDF4E6] px-2 py-0.5 rounded-full">DIN ÅTGÄRD</span>}
                        <p className="font-semibold text-sm text-[#1C1A16]">{c.title}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="badge text-[10px]" style={STATUS[c.status]??{}}>{c.status}</span>
                        <span className="badge text-[10px]" style={PRIO[c.priority]??{}}>{c.priority}</span>
                        {c.assigned_to && <span className="badge text-[10px] bg-[#F0EDE8] text-[#8A8680]">→ {c.assigned_to}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {c.deadline && <p className="text-xs text-[#A8A49A] mb-1">📅 {c.deadline}</p>}
                      <span className="text-[#C5C0B8] text-xs">▾</span>
                    </div>
                  </summary>
                  {c.description && (
                    <div className="px-5 pb-4 pt-1 border-t border-[#F0EDE8]">
                      <p className="text-sm text-[#5A5650] leading-relaxed">{c.description}</p>
                    </div>
                  )}
                </details>
              );
            })}
          </div>
        </div>
      )}

      {closed.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-[#A8A49A] uppercase tracking-wider mb-3">Avslutade ({closed.length})</p>
          <div className="space-y-2">
            {closed.map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-[#E4E0D8] px-5 py-3 flex justify-between items-center opacity-60">
                <p className="text-sm text-[#5A5650] line-through">{c.title}</p>
                <span className="badge text-[10px]" style={STATUS["Stängd"]}>Stängd</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
