// supabase/functions/notify-overdue/index.ts
// Körs dagligen via pg_cron – skickar e-post om försenade ärenden
// Schema: varje vardag kl 08:00
// Supabase Dashboard → Database → Extensions → pg_cron
// SELECT cron.schedule('notify-overdue', '0 8 * * 1-5', $$SELECT net.http_post(...)$$);

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, overdueTemplate } from "../_shared/email.ts";

const APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://din-app.vercel.app";

Deno.serve(async (req) => {
  // Verify cron secret to prevent unauthorized calls
  const secret = req.headers.get("x-cron-secret");
  if (secret !== Deno.env.get("CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date().toISOString().slice(0, 10);

  // Hämta alla försenade öppna ärenden med projektkoppling
  const { data: overdueCases } = await sb
    .from("cases")
    .select(`
      id, title, deadline, priority,
      projects(id, name),
      contacts(name, email)
    `)
    .lt("deadline", today)
    .in("status", ["Öppen", "Pågående"])
    .not("contacts", "is", null);

  if (!overdueCases?.length) {
    return new Response(JSON.stringify({ sent: 0, message: "Inga försenade ärenden" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Gruppera per kontakt-e-post
  const byEmail = new Map<string, {
    name: string;
    cases: { title: string; deadline: string; projectName: string; priority: string }[];
  }>();

  for (const c of overdueCases) {
    const contact = c.contacts as any;
    const project = c.projects as any;
    if (!contact?.email) continue;

    if (!byEmail.has(contact.email)) {
      byEmail.set(contact.email, { name: contact.name, cases: [] });
    }
    byEmail.get(contact.email)!.cases.push({
      title:       c.title,
      deadline:    c.deadline!,
      projectName: project?.name ?? "",
      priority:    c.priority,
    });
  }

  // Skicka ett mejl per kontakt
  let sent = 0;
  const errors: string[] = [];

  for (const [email, data] of byEmail) {
    try {
      await sendEmail({
        to:      email,
        subject: `⚠ ${data.cases.length} försenade ärenden kräver din åtgärd`,
        html:    overdueTemplate({
          recipientName: data.name,
          cases:         data.cases,
          appUrl:        APP_URL,
        }),
      });
      sent++;
    } catch (e: any) {
      errors.push(`${email}: ${e.message}`);
    }
  }

  // Logga körning i Supabase
  await sb.from("function_logs").insert({
    function_name: "notify-overdue",
    result:        { sent, errors, total_cases: overdueCases.length },
  }).then(() => {}).catch(() => {});

  return new Response(JSON.stringify({ sent, errors, total_cases: overdueCases.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
