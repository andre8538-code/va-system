import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function PortalCasesPage({ params }: PageProps) {
  const { id } = await params;
  const sb = await createClient();
  const { data: cases } = await sb
    .from("cases")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-[#1C1A16] mb-6">Ärenden</h1>
      <p>{cases?.length ?? 0} ärenden</p>
    </div>
  );
}
