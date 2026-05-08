// src/app/portal/project/[id]/messages/page.tsx
import { createClient } from "@/lib/supabase/server";
import MessagesClient from "./MessagesClient";

export default async function PortalMessagesPage({ params }: { params: { id: string } }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  const [{ data: messages }, { data: accessRow }] = await Promise.all([
    sb.from("messages").select("*").eq("project_id", params.id).order("created_at"),
    sb.from("portal_access").select("contacts(name)").eq("user_id", user!.id).eq("project_id", params.id).single(),
  ]);

  const senderName = (accessRow?.contacts as any)?.name ?? user?.email ?? "Kund";

  return (
    <MessagesClient
      projectId={params.id}
      initialMessages={messages ?? []}
      senderName={senderName}
      userId={user!.id}
    />
  );
}
