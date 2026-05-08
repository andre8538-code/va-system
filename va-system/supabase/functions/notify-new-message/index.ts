// supabase/functions/notify-new-message/index.ts
// Triggas av Database Webhook när ett nytt meddelande skickas i kundportalen
// Supabase Dashboard → Database → Webhooks → Create webhook
//   Table: messages  |  Events: INSERT  |  URL: .../functions/v1/notify-new-message

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, newMessageTemplate } from "../_shared/email.ts";

const APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://din-app.vercel.app";

interface WebhookPayload {
  type:   "INSERT";
  table:  "messages";
  record: {
    id: string; project_id: string; sender_id: string;
    sender_name: string; sender_role: string; body: string; created_at: string;
  };
}

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get("SUPABASE_WEBHOOK_SECRET");
  if (webhookSecret) {
    const sig = req.headers.get("x-supabase-signature");
    if (sig !== webhookSecret) return new Response("Unauthorized", { status: 401 });
  }

  const payload: WebhookPayload = await req.json();
  const msg = payload.record;

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Hämta projektnamn
  const { data: project } = await sb
    .from("projects").select("name").eq("id", msg.project_id).single();

  const portalUrl = `${APP_URL}/portal/project/${msg.project_id}/messages`;
  const preview   = msg.body.length > 120 ? msg.body.slice(0, 120) + "…" : msg.body;

  if (msg.sender_role === "customer") {
    // Kund skickade → meddela admin (alla admins med e-post)
    const { data: admins } = await sb
      .from("profiles")
      .select("id, full_name")
      .eq("role", "admin");

    if (!admins?.length) {
      return new Response(JSON.stringify({ skipped: "no admins" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Hämta admin-mejladresser från auth.users (service role krävs)
    const adminIds = admins.map(a => a.id);
    const { data: { users } } = await sb.auth.admin.listUsers();
    const adminEmails = users
      .filter(u => adminIds.includes(u.id) && u.email)
      .map(u => ({ email: u.email!, name: admins.find(a => a.id === u.id)?.full_name ?? "Admin" }));

    let sent = 0;
    for (const admin of adminEmails) {
      try {
        await sendEmail({
          to:      admin.email,
          subject: `Nytt meddelande från ${msg.sender_name} – ${project?.name}`,
          html:    newMessageTemplate({
            recipientName:  admin.name,
            senderName:     msg.sender_name,
            projectName:    project?.name ?? "",
            messagePreview: preview,
            portalUrl:      `${APP_URL}/projects/${msg.project_id}`,
          }),
        });
        sent++;
      } catch { /* continue */ }
    }
    return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });

  } else {
    // Admin skickade → meddela kunden/erna med portalåtkomst
    const { data: accessRows } = await sb
      .from("portal_access")
      .select("user_id, contacts(name, email)")
      .eq("project_id", msg.project_id)
      .not("accepted_at", "is", null);

    const recipients = (accessRows ?? [])
      .map(r => r.contacts as any)
      .filter(c => c?.email && c.email !== (sb as any)?.auth?.currentUser?.email);

    let sent = 0;
    for (const c of recipients) {
      try {
        await sendEmail({
          to:      c.email,
          subject: `Nytt meddelande från din konsult – ${project?.name}`,
          html:    newMessageTemplate({
            recipientName:  c.name,
            senderName:     msg.sender_name,
            projectName:    project?.name ?? "",
            messagePreview: preview,
            portalUrl,
          }),
        });
        sent++;
      } catch { /* continue */ }
    }
    return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
  }
});
