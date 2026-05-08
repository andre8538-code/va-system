"use client";
// src/components/ui/FormFields.tsx
// Återanvändbara formulärkomponenter

import { useFormStatus } from "react-dom";

// ─── Submit-knapp med pending-state ──────────────────────────
export function SubmitButton({ label, pendingLabel = "Sparar…" }: { label: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className={`btn-primary px-5 py-2.5 text-sm ${pending ? "opacity-60 cursor-default" : ""}`}>
      {pending ? pendingLabel : label}
    </button>
  );
}

// ─── Fältkomponenter ─────────────────────────────────────────
export function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{required && " *"}</label>
      {children}
    </div>
  );
}

export function TextInput({ name, defaultValue = "", placeholder = "", required, type = "text" }: {
  name: string; defaultValue?: string; placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder}
      required={required} className="input" />
  );
}

export function TextArea({ name, defaultValue = "", placeholder = "", rows = 3, required }: {
  name: string; defaultValue?: string; placeholder?: string; rows?: number; required?: boolean;
}) {
  return (
    <textarea name={name} defaultValue={defaultValue} placeholder={placeholder}
      rows={rows} required={required} className="input resize-none" />
  );
}

export function Select({ name, defaultValue = "", options, required }: {
  name: string; defaultValue?: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <select name={name} defaultValue={defaultValue} required={required} className="input">
      <option value="">Välj…</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function FormGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={`grid gap-4 ${cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {children}
    </div>
  );
}

export function FormActions({ backHref, deleteAction }: { backHref: string; deleteAction?: () => void }) {
  return (
    <div className="flex justify-between items-center pt-2">
      <a href={backHref} className="btn-secondary text-sm">Avbryt</a>
      <div className="flex gap-2 items-center">
        {deleteAction && (
          <button type="button" onClick={deleteAction}
            className="text-sm text-[#B52A2A] hover:underline px-3 py-2">
            Ta bort
          </button>
        )}
        <SubmitButton label="Spara" />
      </div>
    </div>
  );
}
