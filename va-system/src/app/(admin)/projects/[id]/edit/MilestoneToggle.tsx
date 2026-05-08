"use client";
// src/app/(admin)/projects/[id]/edit/MilestoneToggle.tsx
import { useTransition } from "react";
import { toggleMilestoneAction } from "@/lib/actions";
import type { Milestone } from "@/lib/supabase/types";

export default function MilestoneToggle({ milestone, projectId }: { milestone: Milestone; projectId: string }) {
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(() => {
      toggleMilestoneAction(milestone.id, !milestone.done, projectId);
    });
  };

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${pending ? "opacity-50" : ""}`}>
      <button type="button" onClick={toggle}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors shrink-0
          ${milestone.done
            ? "bg-[#1E4D8C] border-[#1E4D8C] text-white"
            : "bg-white border-[#DDDBD6] hover:border-[#1E4D8C]"}`}>
        {milestone.done ? "✓" : ""}
      </button>
      <span className={`text-sm flex-1 ${milestone.done ? "line-through text-[#A8A49A]" : "text-[#1A1916]"}`}>
        {milestone.label}
      </span>
      {milestone.due_date && (
        <span className="text-xs text-[#A8A49A]">{milestone.due_date}</span>
      )}
    </div>
  );
}
