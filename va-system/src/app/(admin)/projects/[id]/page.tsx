import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getCases, getDocuments } from "@/lib/supabase/queries";
import { Field, TextInput, TextArea, Select, FormGrid, SubmitButton } from "@/components/ui/FormFields";
import { updateProjectAction, deleteProjectAction } from "@/lib/actions";

export const metadata: Metadata = { title: "Projekt" };

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const [project, cases, documents] = await Promise.all([
    getProject(id),
    getCases({ projectId: id }),
    getDocuments(id),
  ]);
  if (!project) notFound();
  const update = updateProjectAction.bind(null, project.id);
  const remove = deleteProjectAction.bind(null, project.id);
  return (
    <div className="p-9 max-w-5xl">
      <h1 className="page-title">{project.name}</h1>
      <form action={update} className="card space-y-5">
        <Field label="Namn"><TextInput name="name" defaultValue={project.name} required /></Field>
        <SubmitButton label="Spara" />
      </form>
    </div>
  );
}
