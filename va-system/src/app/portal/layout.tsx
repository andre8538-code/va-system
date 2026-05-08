// src/app/portal/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "admin") redirect("/dashboard");

  return <>{children}</>;
}
