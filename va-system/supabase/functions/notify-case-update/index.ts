// supabase/functions/notify-case-update/index.ts
// Triggas av Supabase Database Webhook när ett ärende uppdateras
// Supabase Dashboard → Database → Webhooks → Create webhook
//   Table: cases  |  Events: UPDATE  |  URL: https://xxx.supabase.co/functions/v1/notify-case-update

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, caseUpdateTemplate } from "../_shared/email.ts";

const APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://din-app.vercel.app";

interface WebhookPayload {
  type:   "UPDATE";
  table:  "cases";
  record: Record<string, any>;   // new row
  old_record: Record<string, any>; // previous row
}

Deno.serve(async (req) => {
  // Supabase webhook signature verification
  const webhookSecret = Deno.env.get("SUPABASE_WEBHOOK_SECRET");
  if (webhookSecret) {
    const signature = req.headers.get("x-supabase-signature");
    if (signature !== webhookSecret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const payload: WebhookPayload = await req.json();
  const { record: newCase, old_record: oldCase } = payload;

  // Skicka bara notis om status faktiskt ändrats
  if (newCase.status === oldCase.status) {
    return new Response(JSON.stringify({ skipped: "status unchanged" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Hämta projekt och kontakt
  const [{ data: project }, { data: contact }, { data: updater }] = await Promise.all([
    sb.from("projects").select("name").eq("id", newCase.project_id).single(),
    sb.from("contacts").select("name, email").eq("id", newCase.contact_id).single(),
    sb.from("profiles").select("full_name").eq("role", "admin").limit(1).single(),
  ]);

  if (!contact?.email) {
    return new Response(JSON.stringify({ skipped: "no contact email" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const caseUrl = `${APP_URL}/portal/project/${newCase.project_id}/cases`;

  await sendEmail({
    to:      contact.email,
    subject: `Ärendeuppdatering: ${newCase.title}`,
    html:    caseUpdateTemplate({
      recipientName: contact.name,
      caseTitle:     newCase.title,
      projectName:   project?.name ?? "",
      newStatus:     newCase.status,
      updatedBy:     updater?.full_name ?? "Konsulten",
      description:   newCase.description ?? undefined,
      caseUrl,
    }),
  });

  return new Response(JSON.stringify({ sent: true, to: contact.email }), {
    headers: { "Content-Type": "application/json" },
  });
});
