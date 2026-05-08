// src/app/(admin)/cases/new/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getProjects, getContacts } from "@/lib/supabase/queries";
import { createCaseAction } from "@/lib/actions";
import { Field, TextInput, TextArea, Select, FormGrid, SubmitButton } from "@/components/ui/FormFields";

export const metadata: Metadata = { title: "Nytt ärende" };

const PRIORITIES = ["Hög","Medium","Låg"].map(v=>({value:v,label:v}));
const STATUSES   = ["Öppen","Pågående","Stängd"].map(v=>({value:v,label:v}));

export default async function NewCasePage({ searchParams }: { searchParams: { project?: string } }) {
  const [projects, contacts] = await Promise.all([getProjects(), getContacts()]);
  const preProject = searchParams.project;

  // Contacts for the pre-selected project
  const projectContacts = preProject
    ? contacts.filter(c => projects.find(p => p.id === preProject)?.contacts?.some(pc => pc.id === c.id))
    : contacts;

  return (
    <div className="p-9 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-[#7A7870] mb-5">
        {preProject
          ? <><Link href={`/projects/${preProject}`} className="hover:text-[#1E4D8C]">Projekt</Link><span>/</span></>
          : <><Link href="/cases" className="hover:text-[#1E4D8C]">Ärenden</Link><span>/</span></>}
        <span className="text-[#1A1916]">Nytt ärende</span>
      </div>
      <h1 className="page-title mb-7">Nytt ärende</h1>

      <form action={createCaseAction} className="card space-y-5">
        <Field label="Titel" required>
          <TextInput name="title" placeholder="t.ex. Inväntar geoteknisk rapport" required />
        </Field>

        <Field label="Projekt" required>
          <select name="projectId" required className="input" defaultValue={preProject ?? ""}>
            <option value="">Välj projekt…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        <Field label="Kontakt">
          <select name="contactId" className="input">
            <option value="">Välj kontakt (valfritt)…</option>
            {projectContacts.map(c => <option key={c.id} value={c.id}>{c.name} – {c.role}</option>)}
          </select>
        </Field>

        <FormGrid cols={3}>
          <Field label="Prioritet">
            <Select name="priority" defaultValue="Medium" options={PRIORITIES} />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="Öppen" options={STATUSES} />
          </Field>
          <Field label="Deadline">
            <TextInput name="deadline" type="date" />
          </Field>
        </FormGrid>

        <Field label="Ansvarig">
          <TextInput name="assignedTo" placeholder="t.ex. Konsult eller Fastighetsägare" />
        </Field>

        <Field label="Beskrivning">
          <TextArea name="description" placeholder="Beskriv ärendet…" rows={4} />
        </Field>

        <div className="flex justify-between items-center border-t border-[#E8E5DF] pt-4">
          <Link href={preProject ? `/projects/${preProject}` : "/cases"} className="btn-secondary">Avbryt</Link>
          <SubmitButton label="Skapa ärende" pendingLabel="Skapar…" />
        </div>
      </form>
    </div>
  );
}
