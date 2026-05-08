// src/app/(admin)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/admin/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.role === "customer") redirect("/portal");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 overflow-y-auto bg-[#F4F3EF]">
        {children}
      </main>
    </div>
  );
}
