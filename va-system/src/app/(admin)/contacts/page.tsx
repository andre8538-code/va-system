// src/app/(admin)/contacts/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getContacts, getProjects } from "@/lib/supabase/queries";

export const metadata: Metadata = { title: "Kontakter" };

const ROLE_CFG: Record<string, { bg: string; color: string }> = {
  "Fastighetsägare": { bg: "#EEF2FF", color: "#3730A3" },
  "Entreprenör":     { bg: "#FEF3C7", color: "#92400E" },
  "Samfällighet":    { bg: "#DCFCE7", color: "#166534" },
  "Företag":         { bg: "#FCE7F3", color: "#9D174D" },
};

export default async function ContactsPage() {
  const [contacts, projects] = await Promise.all([getContacts(), getProjects()]);

  return (
    <div className="p-9 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Kontakter</h1>
        <Link href="/contacts/new" className="btn-primary">+ Ny kontakt</Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {contacts.map(c => {
          const cProjects = projects.filter(p => p.contacts?.some(ct => ct.id === c.id));
          const cfg = ROLE_CFG[c.role] ?? { bg: "#F0EEE9", color: "#5A5850" };
          return (
            <Link key={c.id} href={`/contacts/${c.id}`}
              className="card hover:shadow-md hover:-translate-y-px transition-all block">
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-full bg-[#E8EEF7] flex items-center justify-center text-[#1E4D8C] font-bold text-base">
                  {c.name.charAt(0)}
                </div>
                <span className="badge text-[10px]" style={cfg}>{c.role}</span>
              </div>
              <p className="font-bold text-[15px] mb-1">{c.name}</p>
              {c.email && <p className="text-xs text-[#7A7870] mb-0.5">✉ {c.email}</p>}
              {c.phone && <p className="text-xs text-[#7A7870] mb-3">📞 {c.phone}</p>}
              <div className="border-t border-[#E8E5DF] pt-3">
                <p className="text-[10px] font-bold text-[#7A7870] uppercase tracking-wider mb-1.5">
                  Projekt ({cProjects.length})
                </p>
                {cProjects.slice(0, 2).map(p => (
                  <p key={p.id} className="text-xs text-[#1E4D8C] truncate">• {p.name}</p>
                ))}
                {cProjects.length > 2 && <p className="text-xs text-[#7A7870]">+{cProjects.length - 2} till</p>}
              </div>
            </Link>
          );
        })}
        {contacts.length === 0 && (
          <div className="col-span-3 card text-center py-12 text-[#7A7870]">Inga kontakter ännu.</div>
        )}
      </div>
    </div>
  );
}
