// src/app/(admin)/cases/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjects, getContacts } from "@/lib/supabase/queries";
import { updateCaseAction, deleteCaseAction } from "@/lib/actions";
import { Field, TextInput, TextArea, Select, FormGrid, SubmitButton } from "@/components/ui/FormFields";
import StatusChanger from "./StatusChanger";

export const metadata: Metadata = { title: "Ärende" };

const PRIORITIES = ["Hög","Medium","Låg"].map(v=>({value:v,label:v}));
const STATUSES   = ["Öppen","Pågående","Stängd"].map(v=>({value:v,label:v}));
const PRIO_CFG: Record<string, { bg: string; color: string }> = {
  "Hög":    { bg: "#FAE8E8", color: "#B52A2A" },
  "Medium": { bg: "#FDF0E4", color: "#B5620A" },
  "Låg":    { bg: "#F0EEE9", color: "#7A7870" },
};
const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  "Öppen":    { bg: "#E8EEF7", color: "#3A6DB5" },
  "Pågående": { bg: "#FDF0E4", color: "#B5620A" },
  "Stängd":   { bg: "#E6F4EC", color: "#2D7A4F" },
};

export default async function CasePage({ params }: { params: { id: string } }) {
  const sb = await createClient();
  const [{ data: caseData }, projects, contacts] = await Promise.all([
    sb.from("cases").select("*, contacts(*), projects(id,name)").eq("id", params.id).single(),
    getProjects(),
    getContacts(),
  ]);
  if (!caseData) notFound();

  const project  = caseData.projects as any;
  const contact  = caseData.contacts as any;
  const pContacts = contacts.filter(c =>
    projects.find(p => p.id === caseData.project_id)?.contacts?.some(pc => pc.id === c.id)
  );

  const update = updateCaseAction.bind(null, caseData.id);
  const remove = deleteCaseAction.bind(null, caseData.id, caseData.project_id);
  const overdue = caseData.deadline && new Date(caseData.deadline) < new Date() && caseData.status !== "Stängd";

  return (
    <div className="p-9 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-[#7A7870] mb-5">
        <Link href="/cases" className="hover:text-[#1E4D8C]">Ärenden</Link>
        <span>/</span>
        <span className="text-[#1A1916] truncate max-w-[300px]">{caseData.title}</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 pr-4">
          <h1 className="page-title mb-2">{caseData.title}</h1>
          {project && (
            <Link href={`/projects/${project.id}`} className="text-sm text-[#1E4D8C] hover:underline">
              📁 {project.name}
            </Link>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <span className="badge" style={PRIO_CFG[caseData.priority] ?? {}}>{caseData.priority}</span>
          <span className="badge" style={STATUS_CFG[caseData.status] ?? {}}>{caseData.status}</span>
        </div>
      </div>

      {overdue && (
        <div className="bg-[#FAE8E8] border border-[#B52A2A]/20 rounded-xl px-4 py-3 mb-5 text-sm text-[#B52A2A] font-medium">
          ⚠ Deadline passerad – {caseData.deadline}
        </div>
      )}

      {/* Quick status change */}
      <StatusChanger caseId={caseData.id} current={caseData.status} projectId={caseData.project_id} />

      {/* Edit form */}
      <form action={update} className="card space-y-5 mb-5">
        <Field label="Titel" required>
          <TextInput name="title" defaultValue={caseData.title} required />
        </Field>

        <Field label="Kontakt">
          <select name="contactId" className="input" defaultValue={caseData.contact_id ?? ""}>
            <option value="">Ingen kontakt</option>
            {pContacts.map(c => <option key={c.id} value={c.id}>{c.name} – {c.role}</option>)}
          </select>
        </Field>

        <FormGrid cols={3}>
          <Field label="Prioritet">
            <Select name="priority" defaultValue={caseData.priority} options={PRIORITIES} />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={caseData.status} options={STATUSES} />
          </Field>
          <Field label="Deadline">
            <TextInput name="deadline" type="date" defaultValue={caseData.deadline ?? ""} />
          </Field>
        </FormGrid>

        <Field label="Ansvarig">
          <TextInput name="assignedTo" defaultValue={caseData.assigned_to ?? ""} placeholder="t.ex. Konsult" />
        </Field>

        <Field label="Beskrivning">
          <TextArea name="description" defaultValue={caseData.description ?? ""} rows={4} />
        </Field>

        <div className="flex justify-between items-center border-t border-[#E8E5DF] pt-4">
          <Link href={project ? `/projects/${project.id}` : "/cases"} className="btn-secondary">Tillbaka</Link>
          <div className="flex gap-3 items-center">
            <form action={remove}>
              <button type="submit"
                onClick={e => { if (!confirm("Ta bort ärendet?")) e.preventDefault(); }}
                className="text-sm text-[#B52A2A] hover:underline px-2">Ta bort</button>
            </form>
            <SubmitButton label="Spara ändringar" />
          </div>
        </div>
      </form>
    </div>
  );
}
