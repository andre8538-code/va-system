import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function PortalDocumentsPage({ params }: PageProps) {
  const { id } = await params;
  const sb = await createClient();
  const { data: documents } = await sb
    .from("documents")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-[#1C1A16] mb-6">Dokument</h1>
      <p>{documents?.length ?? 0} dokument</p>
    </div>
  );
}
