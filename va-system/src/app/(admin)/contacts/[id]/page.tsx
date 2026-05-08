// src/app/(admin)/contacts/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/lib/supabase/queries";
import { updateContactAction, deleteContactAction, generateInviteAction } from "@/lib/actions";
import { Field, TextInput, TextArea, Select, FormGrid, SubmitButton } from "@/components/ui/FormFields";
import InviteButton from "./InviteButton";

export const metadata: Metadata = { title: "Kontakt" };

const ROLES = ["Fastighetsägare","Entreprenör","Samfällighet","Företag"].map(v=>({value:v,label:v}));
const ROLE_CFG: Record<string, { bg: string; color: string }> = {
  "Fastighetsägare": { bg: "#EEF2FF", color: "#3730A3" },
  "Entreprenör":     { bg: "#FEF3C7", color: "#92400E" },
  "Samfällighet":    { bg: "#DCFCE7", color: "#166534" },
  "Företag":         { bg: "#FCE7F3", color: "#9D174D" },
};

export default async function ContactPage({ params }: { params: { id: string } }) {
  const sb = await createClient();
  const [{ data: contact }, projects] = await Promise.all([
    sb.from("contacts").select("*").eq("id", params.id).single(),
    getProjects(),
  ]);
  if (!contact) notFound();

  // Get linked projects
  const { data: linkedRows } = await sb.from("project_contacts")
    .select("project_id").eq("contact_id", params.id);
  const linkedProjectIds = new Set(linkedRows?.map(r => r.project_id) ?? []);
  const linkedProjects = projects.filter(p => linkedProjectIds.has(p.id));

  // Portal access
  const { data: portalRows } = await sb.from("portal_access")
    .select("*").eq("contact_id", params.id);

  const update = updateContactAction.bind(null, contact.id);
  const remove = deleteContactAction.bind(null, contact.id);
  const cfg = ROLE_CFG[contact.role] ?? { bg: "#F0EEE9", color: "#5A5850" };

  return (
    <div className="p-9 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-[#7A7870] mb-5">
        <Link href="/contacts" className="hover:text-[#1E4D8C]">Kontakter</Link>
        <span>/</span><span className="text-[#1A1916]">{contact.name}</span>
      </div>

      <div className="flex items-center gap-4 mb-7">
        <div className="w-12 h-12 rounded-full bg-[#E8EEF7] flex items-center justify-center text-[#1E4D8C] font-bold text-xl">
          {contact.name.charAt(0)}
        </div>
        <div>
          <h1 className="page-title leading-none mb-1">{contact.name}</h1>
          <span className="badge text-[11px]" style={cfg}>{contact.role}</span>
        </div>
      </div>

      {/* Edit form */}
      <form action={update} className="card space-y-5 mb-5">
        <Field label="Namn" required>
          <TextInput name="name" defaultValue={contact.name} required />
        </Field>
        <FormGrid>
          <Field label="Roll" required>
            <Select name="role" defaultValue={contact.role} options={ROLES} required />
          </Field>
          <Field label="Företag">
            <TextInput name="company" defaultValue={contact.company ?? ""} />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="E-post">
            <TextInput name="email" type="email" defaultValue={contact.email ?? ""} />
          </Field>
          <Field label="Telefon">
            <TextInput name="phone" defaultValue={contact.phone ?? ""} />
          </Field>
        </FormGrid>
        <Field label="Anteckningar">
          <TextArea name="notes" defaultValue={contact.notes ?? ""} rows={2} />
        </Field>
        <div className="flex justify-between items-center border-t border-[#E8E5DF] pt-4">
          <Link href="/contacts" className="btn-secondary">Tillbaka</Link>
          <div className="flex gap-3 items-center">
            <form action={remove}>
              <button type="submit"
                onClick={e => { if (!confirm("Ta bort kontakten?")) e.preventDefault(); }}
                className="text-sm text-[#B52A2A] hover:underline px-2">Ta bort</button>
            </form>
            <SubmitButton label="Spara ändringar" />
          </div>
        </div>
      </form>

      {/* Linked projects */}
      <div className="card mb-5">
        <div className="flex justify-between items-center mb-4">
          <p className="section-title">Projekt ({linkedProjects.length})</p>
          <Link href={`/contacts/new?project=`} className="text-xs text-[#1E4D8C] hover:underline">+ Koppla projekt</Link>
        </div>
        {linkedProjects.length === 0
          ? <p className="text-sm text-[#7A7870]">Inte kopplad till något projekt.</p>
          : linkedProjects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="flex justify-between items-center py-2.5 border-b border-[#E8E5DF] last:border-0 hover:text-[#1E4D8C] transition-colors">
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-xs text-[#7A7870]">{p.status}</span>
              </Link>
            ))}
      </div>

      {/* Portal access */}
      <div className="card">
        <p className="section-title mb-4">Kundportal-åtkomst</p>
        {linkedProjects.length === 0
          ? <p className="text-sm text-[#7A7870]">Koppla kontakten till ett projekt för att generera inbjudningslänk.</p>
          : linkedProjects.map(p => {
              const access = portalRows?.find(r => r.project_id === p.id);
              return (
                <div key={p.id} className="flex justify-between items-center py-2.5 border-b border-[#E8E5DF] last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    {access?.accepted_at
                      ? <p className="text-xs text-[#2D7A4F]">✓ Accepterad {access.accepted_at.slice(0,10)}</p>
                      : access
                      ? <p className="text-xs text-[#B5620A]">⏳ Inbjudan skickad, ej accepterad</p>
                      : <p className="text-xs text-[#A8A49A]">Ingen inbjudan skickad</p>}
                  </div>
                  <InviteButton
                    contactId={contact.id}
                    projectId={p.id}
                    existingToken={access?.invite_token}
                  />
                </div>
              );
            })}
      </div>
    </div>
  );
}
