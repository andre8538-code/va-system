// supabase/functions/send-invite/index.ts
// Anropas från Next.js-appen när admin genererar en inbjudningslänk
// POST { contactId, projectId } med admin-session

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, inviteTemplate } from "../_shared/email.ts";

const APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://din-app.vercel.app";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  // Verify caller is authenticated admin via JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // Verify admin role
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await sb.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { contactId, projectId } = await req.json();
  if (!contactId || !projectId) {
    return new Response(JSON.stringify({ error: "contactId och projectId krävs" }), { status: 400 });
  }

  // Upsert portal_access och hämta token
  const { data: access, error: accessError } = await sb
    .from("portal_access")
    .upsert({ contact_id: contactId, project_id: projectId }, { onConflict: "contact_id,project_id" })
    .select("invite_token, contacts(name, email), projects(name)")
    .single();

  if (accessError || !access) {
    return new Response(JSON.stringify({ error: "Kunde inte skapa inbjudan" }), { status: 500 });
  }

  const contact = access.contacts as any;
  const project = access.projects as any;

  if (!contact?.email) {
    return new Response(JSON.stringify({ error: "Kontakten har ingen e-postadress" }), { status: 400 });
  }

  const inviteUrl = `${APP_URL}/portal/invite/${access.invite_token}`;

  try {
    await sendEmail({
      to:      contact.email,
      subject: `Inbjudan till projektportalen – ${project?.name}`,
      html:    inviteTemplate({
        recipientName:  contact.name,
        projectName:    project?.name ?? "",
        consultantName: profile?.full_name ?? "VA Konsult",
        inviteUrl,
      }),
      replyTo: user.email ?? undefined,
    });

    return new Response(JSON.stringify({
      sent:       true,
      to:         contact.email,
      inviteUrl,
    }), { headers: { "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
