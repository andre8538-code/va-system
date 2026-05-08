// src/app/portal/project/[id]/documents/page.tsx
import { createClient } from "@/lib/supabase/server";
import DocumentUploader from "./DocumentUploader";

const FILE_ICON: Record<string, string> = {
  pdf: "📄", dwg: "📐", docx: "📝", xlsx: "📊",
  jpg: "🖼", jpeg: "🖼", png: "🖼", default: "📎",
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function PortalDocumentsPage({ params }: { params: { id: string } }) {
  const sb = await createClient();

  const { data: documents } = await sb
    .from("documents")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  const byCategory = (documents ?? []).reduce<Record<string, typeof documents>>((acc, doc) => {
    const cat = doc!.category ?? "Övrigt";
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(doc);
    return acc;
  }, {});

  // Generate signed URLs
  const docsWithUrls = await Promise.all(
    (documents ?? []).map(async doc => {
      const { data } = await sb.storage
        .from("project-documents")
        .createSignedUrl(doc!.storage_path, 3600);
      return { ...doc, signedUrl: data?.signedUrl ?? "" };
    })
  );

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-[#1C1A16] mb-6">Dokument</h1>

      {/* Upload zone */}
      <DocumentUploader projectId={params.id} />

      {/* Document list */}
      {Object.entries(byCategory).map(([category, docs]) => (
        <div key={category} className="mb-6">
          <p className="text-[11px] font-bold text-[#A8A49A] uppercase tracking-wider mb-3">{category}</p>
          <div className="space-y-2">
            {docs!.map(doc => {
              const withUrl = docsWithUrls.find(d => d.id === doc!.id);
              const ext = doc!.name.split(".").pop()?.toLowerCase() ?? "";
              return (
                <div key={doc!.id}
                  className="flex items-center justify-between bg-white rounded-xl border border-[#E4E0D8] px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{FILE_ICON[ext] ?? FILE_ICON.default}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1C1A16] truncate">{doc!.name}</p>
                      <p className="text-xs text-[#A8A49A]">
                        {formatBytes(doc!.size_bytes)}
                        {doc!.uploaded_by_name && ` · ${doc!.uploaded_by_name}`}
                        {` · ${doc!.created_at?.slice(0, 10)}`}
                      </p>
                    </div>
                  </div>
                  {withUrl?.signedUrl && (
                    <a href={withUrl.signedUrl} download={doc!.name} target="_blank"
                      className="shrink-0 ml-3 text-xs font-semibold text-[#0D6B5E] bg-[#E6F3F1] px-3 py-1.5 rounded-lg hover:bg-[#0D6B5E] hover:text-white transition-colors">
                      ↓ Ladda ner
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {(documents ?? []).length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E4E0D8] p-10 text-center mt-4">
          <p className="text-3xl mb-2">📂</p>
          <p className="text-sm text-[#7E7A6F]">Inga dokument uppladdade ännu.</p>
        </div>
      )}
    </div>
  );
}
