"use client";
// src/app/(admin)/contacts/[id]/InviteButton.tsx
import { useState, useTransition } from "react";
import { generateInviteAction } from "@/lib/actions";

export default function InviteButton({ contactId, projectId, existingToken }: {
  contactId: string; projectId: string; existingToken?: string;
}) {
  const [token, setToken]     = useState(existingToken ?? "");
  const [copied, setCopied]   = useState(false);
  const [pending, startTransition] = useTransition();

  const generate = () => {
    startTransition(async () => {
      // 1. Skapa/hämta token via Server Action
      const t = await generateInviteAction(contactId, projectId);
      setToken(t);

      // 2. Skicka inbjudningsmejl via Edge Function
      try {
        const sb = (await import("@/lib/supabase/client")).createClient();
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          await fetch(`${supabaseUrl}/functions/v1/send-invite`, {
            method:  "POST",
            headers: {
              "Content-Type":  "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ contactId, projectId }),
          });
        }
      } catch { /* mejl är nice-to-have, token är klar ändå */ }
    });
  };

  const copy = () => {
    const url = `${window.location.origin}/portal/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (token) {
    return (
      <button onClick={copy} className="text-xs px-3 py-1.5 rounded-lg border border-[#DDDBD6] hover:bg-[#F4F3EF] transition-colors">
        {copied ? "✓ Kopierad!" : "📋 Kopiera länk"}
      </button>
    );
  }

  return (
    <button onClick={generate} disabled={pending}
      className="text-xs btn-primary px-3 py-1.5">
      {pending ? "Genererar…" : "Generera länk"}
    </button>
  );
}
