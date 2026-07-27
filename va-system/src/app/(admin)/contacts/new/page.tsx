// src/app/(admin)/contacts/new/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getProjects } from "@/lib/supabase/queries";
import { createContactAction } from "@/lib/actions";
import { Field, TextInput, TextArea, Select, FormGrid, SubmitButton } from "@/components/ui/FormFields";

export const metadata: Metadata = { title: "Ny kontakt" };

const ROLES = ["Fastighetsägare","Entreprenör","Samfällighet","Företag"].map(v=>({value:v,label:v}));

export default async function NewContactPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {  
  const projects = await getProjects();
  const { project: fromProject } = await searchParams;
  return (
    <div className="p-9 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-[#7A7870] mb-5">
        {fromProject
          ? <><Link href={`/projects/${fromProject}`} className="hover:text-[#1E4D8C]">Projekt</Link><span>/</span></>
          : <><Link href="/contacts" className="hover:text-[#1E4D8C]">Kontakter</Link><span>/</span></>}
        <span className="text-[#1A1916]">Ny kontakt</span>
      </div>
      <h1 className="page-title mb-7">Ny kontakt</h1>

      <form action={createContactAction} className="card space-y-5">
        {/* Pass project context */}
        {fromProject && <input type="hidden" name="projectId" value={fromProject} />}

        <Field label="Namn" required>
          <TextInput name="name" placeholder="Förnamn Efternamn" required />
        </Field>

        <FormGrid>
          <Field label="Roll" required>
            <Select name="role" options={ROLES} required />
          </Field>
          <Field label="Företag">
            <TextInput name="company" placeholder="Företagsnamn (valfritt)" />
          </Field>
        </FormGrid>

        <FormGrid>
          <Field label="E-post">
            <TextInput name="email" type="email" placeholder="namn@foretag.se" />
          </Field>
          <Field label="Telefon">
            <TextInput name="phone" placeholder="070-000 00 00" />
          </Field>
        </FormGrid>

        {/* Project link (if not coming from a project) */}
        {!fromProject && (
          <Field label="Koppla till projekt (valfritt)">
            <select name="projectId" className="input">
              <option value="">Välj projekt…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}

        <Field label="Anteckningar">
          <TextArea name="notes" placeholder="Intern anteckning om kontakten…" rows={2} />
        </Field>

        <div className="flex justify-between items-center border-t border-[#E8E5DF] pt-4">
          <Link href={fromProject ? `/projects/${fromProject}` : "/contacts"} className="btn-secondary">
            Avbryt
          </Link>
          <SubmitButton label="Spara kontakt" pendingLabel="Sparar…" />
        </div>
      </form>
    </div>
  );
}
