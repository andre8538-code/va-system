import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ProjectPortalLayout({
  children,
  params,
}: LayoutProps) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: access } = await sb
    .from("portal_access")
    .select("id, projects(id, name)")
    .eq("user_id", user.id)
    .eq("project_id", id)
    .single();

  if (!access) notFound();
  const project = access.projects as any;

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col">
      <header className="bg-white border-b border-[#E4E0D8] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <span className="text-sm text-[#7E7A6F]">{project?.name}</span>
        </div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
