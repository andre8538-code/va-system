"use client";
// src/app/(admin)/cases/[id]/StatusChanger.tsx
import { useTransition } from "react";
import { updateCaseStatusAction } from "@/lib/actions";
import type { CaseStatus } from "@/lib/supabase/types";

const STATUSES: { value: CaseStatus; label: string; bg: string; color: string }[] = [
  { value: "Öppen",    label: "Öppen",    bg: "#E8EEF7", color: "#3A6DB5" },
  { value: "Pågående", label: "Pågående", bg: "#FDF0E4", color: "#B5620A" },
  { value: "Stängd",   label: "Stängd",   bg: "#E6F4EC", color: "#2D7A4F" },
];

export default function StatusChanger({ caseId, current, projectId }: {
  caseId: string; current: string; projectId: string;
}) {
  const [pending, startTransition] = useTransition();

  const change = (status: CaseStatus) => {
    if (status === current) return;
    startTransition(() => { updateCaseStatusAction(caseId, status, projectId); });
  };

  return (
    <div className="flex gap-2 mb-5">
      {STATUSES.map(s => (
        <button key={s.value} type="button" onClick={() => change(s.value)} disabled={pending}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border-2
            ${current === s.value
              ? "border-current shadow-sm"
              : "border-transparent opacity-50 hover:opacity-80"}`}
          style={{ background: s.bg, color: s.color }}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
