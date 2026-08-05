"use client";
// src/app/(admin)/contacts/[id]/LinkProjectForm.tsx
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkContactToProjectAction } from "@/lib/actions";

export default function LinkProjectForm({ contactId, unlinkedProjects }: {
  contactId: string;
  unlinkedProjects: { id: string; name: string }[];
}) {
  const [projectId, setProjectId] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleLink = () => {
    if (!projectId) return;
    startTransition(async () => {
      await linkContactToProjectAction(contactId, projectId);
      setProjectId("");
      router.refresh();
    });
  };

  if (unlinkedProjects.length === 0) return null;

  return (
    <div className="flex gap-2 items-center pt-4 mt-2 border-t border-[#E8E5DF]">
      <select
        value={projectId}
        onChange={e => setProjectId(e.target.value)}
        className="input flex-1"
      >
        <option value="">Välj projekt att koppla…</option>
        {unlinkedProjects.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <button
        onClick={handleLink}
        disabled={!projectId || pending}
        className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
      >
        {pending ? "Kopplar…" : "+ Koppla"}
      </button>
    </div>
  );
}
