// src/app/(admin)/projects/new/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { createProjectAction } from "@/lib/actions";
import { Field, TextInput, TextArea, Select, FormGrid, SubmitButton } from "@/components/ui/FormFields";

export const metadata: Metadata = { title: "Nytt projekt" };

const PROJECT_TYPES  = ["VA-utredning","Besiktning","Rådgivning","Tillstånd"].map(v=>({value:v,label:v}));
const PROJECT_STATUS = ["Förfrågan","Aktiv","Granskning","Avslutat"].map(v=>({value:v,label:v}));

export default function NewProjectPage() {
  return (
    <div className="p-9 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-[#7A7870] mb-5">
        <Link href="/projects" className="hover:text-[#1E4D8C]">Projekt</Link>
        <span>/</span><span className="text-[#1A1916]">Nytt projekt</span>
      </div>
      <h1 className="page-title mb-7">Nytt projekt</h1>

      <form action={createProjectAction} className="card space-y-5">
        <Field label="Projektnamn" required>
          <TextInput name="name" placeholder="t.ex. Storgatan 14 – Dagvattenutredning" required />
        </Field>

        <Field label="Kund / Uppdragsgivare" required>
          <TextInput name="client" placeholder="t.ex. AB Fastigheter Nord" required />
        </Field>

        <FormGrid>
          <Field label="Typ" required>
            <Select name="type" options={PROJECT_TYPES} required />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="Förfrågan" options={PROJECT_STATUS} />
          </Field>
        </FormGrid>

        <Field label="Deadline">
          <TextInput name="deadline" type="date" />
        </Field>

        <Field label="Beskrivning">
          <TextArea name="description" placeholder="Kort beskrivning av uppdraget…" rows={3} />
        </Field>

        <Field label="Milstolpar (en per rad)">
          <TextArea name="milestones"
            placeholder={"Platsbesök & inventering\nFlödesmätning slutförd\nSlutrapport levererad"}
            rows={4} />
          <p className="text-xs text-[#A8A49A] mt-1">Lägg till initiala milstolpar – kan ändras senare.</p>
        </Field>

        <div className="flex justify-between items-center border-t border-[#E8E5DF] pt-4">
          <Link href="/projects" className="btn-secondary">Avbryt</Link>
          <SubmitButton label="Skapa projekt" pendingLabel="Skapar…" />
        </div>
      </form>
    </div>
  );
}
