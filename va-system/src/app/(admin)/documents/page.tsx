// src/app/(admin)/documents/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/lib/supabase/queries";
import { getGraphToken, listProjectFiles, getAuthUrl } from "@/lib/onedrive";
import OneDriveUploader from "./OneDriveUploader";

export const metadata: Metadata = { title: "OneDrive" };

const FILE_ICON: Record<string, string> = {
  "application/pdf": "📄",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",
  "image/jpeg": "🖼", "image/png": "🖼",
  "application/acad": "📐",
  default: "📎",
};

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default async function DocumentsPage({
  searchParams
}: {
  searchParams: Promise<{ project?: string; connected?: string; error?: string }>
}) {
  const { project, connected, error } = await searchParams;
  const sb = await createClient();
  const [projects, { data: setting }] = await Promise.all([
    getProjects(),
    sb.from("settings").select("value").eq("key", "onedrive_refresh_token").single(),
  ]);

  const isConnected = !!setting?.value;
  const authUrl     = getAuthUrl("documents");
const selProject = project ? projects.find(p => p.id === project) : null;
  // Fetch OneDrive files for selected project
  let odFiles: Awaited<ReturnType<typeof listProjectFiles>> = [];
  if (isConnected && selProject) {
    try {
      const token = await getGraphToken(setting!.value);
      odFiles = await listProjectFiles(token, selProject.name);
    } catch { /* token expired or folder missing */ }
  }

  return (
    <div className="p-9 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">OneDrive – Dokument</h1>
        {isConnected ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E8EEF7] border border-[#1E4D8C]/15">
            <span className="text-sm">☁</span>
            <span className="text-sm font-semibold text-[#1E4D8C]">Microsoft 365 ansluten</span>
          </div>
        ) : (
          <a href={authUrl} className="btn-primary">Anslut OneDrive →</a>
        )}
      </div>

      {connected && (
        <div className="bg-[#E6F4EC] border border-[#2D7A4F]/20 rounded-xl px-4 py-3 mb-5 text-sm text-[#2D7A4F] font-medium">
          ✓ OneDrive anslutet!
        </div>
      )}
      {error && (
        <div className="bg-[#FAE8E8] border border-[#B52A2A]/20 rounded-xl px-4 py-3 mb-5 text-sm text-[#B52A2A]">
          Kunde inte ansluta OneDrive. Försök igen.
        </div>
      )}

      {!isConnected ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">☁</p>
          <h2 className="font-display text-xl font-bold text-[#1A1916] mb-2">Anslut OneDrive</h2>
          <p className="text-sm text-[#7A7870] mb-6 max-w-sm mx-auto">
            Koppla ditt Microsoft 365-konto för att hantera projektdokument direkt i VA-systemet.
            Filer lagras automatiskt i <code className="bg-[#F4F3EF] px-1.5 py-0.5 rounded text-xs">/VA-Projekt/[projektnamn]/</code> i din OneDrive.
          </p>
          <a href={authUrl} className="btn-primary inline-block">Anslut Microsoft 365 →</a>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {/* Project list */}
          <div className="col-span-1 space-y-1.5">
            <p className="text-[11px] font-bold text-[#7A7870] uppercase tracking-wider px-1 mb-2">Projekt</p>
            {projects.map(p => (
              <Link key={p.id} href={`/documents?project=${p.id}`}
                className={`block px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${selProject?.id === p.id
                    ? "bg-[#E8EEF7] text-[#1E4D8C] font-semibold"
                    : "text-[#5A5850] hover:bg-[#F4F3EF]"}`}>
                <p className="truncate">{p.name.split("–")[0].trim()}</p>
                <p className="text-[11px] text-[#A8A49A] truncate">{p.client}</p>
              </Link>
            ))}
          </div>

          {/* File area */}
          <div className="col-span-3">
            {!selProject ? (
              <div className="card text-center py-14 text-[#7A7870]">
                <p className="text-3xl mb-2">📁</p>
                <p className="text-sm">Välj ett projekt till vänster för att se dess filer.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="font-bold text-[#1A1916]">{selProject.name}</h2>
                    <p className="text-xs text-[#7A7870] mt-0.5">
                      OneDrive: <code className="bg-[#F4F3EF] px-1 py-0.5 rounded">/VA-Projekt/{selProject.name}/</code>
                    </p>
                  </div>
                </div>

                {/* Upload */}
                <OneDriveUploader projectId={selProject.id} projectName={selProject.name} />

                {/* Files */}
                {odFiles.length === 0 ? (
                  <div className="card text-center py-10 text-[#7A7870] mt-3">
                    <p className="text-2xl mb-2">📂</p>
                    <p className="text-sm">Inga filer i projektmappen ännu.</p>
                  </div>
                ) : (
                  <div className="space-y-2 mt-3">
                    {odFiles.filter(f => !f.isFolder).map(f => (
                      <div key={f.id}
                        className="flex items-center justify-between bg-white border border-[#DDDBD6] rounded-xl px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl shrink-0">{FILE_ICON[f.mimeType] ?? FILE_ICON.default}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{f.name}</p>
                            <p className="text-xs text-[#7A7870]">{formatBytes(f.size)} · {f.lastModified}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-3 shrink-0">
                          <a href={f.webUrl} target="_blank"
                            className="text-xs text-[#1E4D8C] hover:underline px-2 py-1.5">Öppna →</a>
                          {f.downloadUrl && (
                            <a href={f.downloadUrl} download={f.name}
                              className="text-xs btn-secondary px-3 py-1.5">↓</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
