// src/app/(admin)/projects/[id]/edit/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/supabase/queries";
import { updateProjectAction, deleteProjectAction, toggleMilestoneAction } from "@/lib/actions";
import { Field, TextInput, TextArea, Select, FormGrid, SubmitButton } from "@/components/ui/FormFields";
import MilestoneToggle from "./MilestoneToggle";

export const metadata: Metadata = { title: "Redigera projekt" };

const PROJECT_TYPES  = ["VA-utredning","Besiktning","Rådgivning","Tillstånd"].map(v=>({value:v,label:v}));
const PROJECT_STATUS = ["Förfrågan","Aktiv","Granskning","Avslutat"].map(v=>({value:v,label:v}));

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();

  const update = updateProjectAction.bind(null, project.id);
  const remove = deleteProjectAction.bind(null, project.id);

  return (
    <div className="p-9 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-[#7A7870] mb-5">
        <Link href="/projects" className="hover:text-[#1E4D8C]">Projekt</Link>
        <span>/</span>
        <Link href={`/projects/${project.id}`} className="hover:text-[#1E4D8C] truncate max-w-[200px]">{project.name}</Link>
        <span>/</span><span>Redigera</span>
      </div>
      <h1 className="page-title mb-7">Redigera projekt</h1>

      <form action={update} className="card space-y-5 mb-6">
        <Field label="Projektnamn" required>
          <TextInput name="name" defaultValue={project.name} required />
        </Field>
        <Field label="Kund / Uppdragsgivare" required>
          <TextInput name="client" defaultValue={project.client} required />
        </Field>
        <FormGrid>
          <Field label="Typ" required>
            <Select name="type" defaultValue={project.type} options={PROJECT_TYPES} required />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={project.status} options={PROJECT_STATUS} />
          </Field>
        </FormGrid>
        <Field label="Deadline">
          <TextInput name="deadline" type="date" defaultValue={project.deadline ?? ""} />
        </Field>
        <Field label="Beskrivning">
          <TextArea name="description" defaultValue={project.description ?? ""} rows={3} />
        </Field>

        <div className="flex justify-between items-center border-t border-[#E8E5DF] pt-4">
          <Link href={`/projects/${project.id}`} className="btn-secondary">Avbryt</Link>
          <div className="flex items-center gap-3">
            <form action={remove}>
              <button type="submit"
                onClick={e => { if (!confirm("Ta bort projektet? Detta går inte att ångra.")) e.preventDefault(); }}
                className="text-sm text-[#B52A2A] hover:underline px-2">
                Ta bort projekt
              </button>
            </form>
            <SubmitButton label="Spara ändringar" />
          </div>
        </div>
      </form>

      {/* Milestones */}
      {(project.milestones?.length ?? 0) > 0 && (
        <div className="card">
          <p className="section-title mb-4">Milstolpar</p>
          <div className="space-y-2">
            {project.milestones!.sort((a,b)=>a.sort_order-b.sort_order).map(m => (
              <MilestoneToggle key={m.id} milestone={m} projectId={project.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
