"use client";
// src/app/(admin)/documents/GoogleDriveUploader.tsx
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
export default function GoogleDriveUploader({ projectId, projectName }: {
  projectId: string; projectName: string;
}) {
  const [dragOver, setDragOver]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults]     = useState<{ name: string; ok: boolean }[]>([]);
  const inputRef                  = useRef<HTMLInputElement>(null);
  const router                    = useRouter();
  const upload = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true); setResults([]);
    const res: typeof results = [];
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("projectId", projectId);
      form.append("projectName", projectName);
      const r = await fetch("/api/googledrive/upload", { method: "POST", body: form });
      res.push({ name: file.name, ok: r.ok });
    }
    setResults(res);
    setUploading(false);
    if (res.some(r => r.ok)) { router.refresh(); setTimeout(() => setResults([]), 4000); }
  };
  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); upload(Array.from(e.dataTransfer.files)); }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed px-5 py-6 text-center cursor-pointer transition-all
          ${dragOver ? "border-[#1E4D8C] bg-[#E8EEF7]" : "border-[#DDDBD6] bg-[#F4F3EF] hover:border-[#1E4D8C]/50"}`}>
        <input ref={inputRef} type="file" multiple className="hidden"
          onChange={e => upload(Array.from(e.target.files ?? []))} />
        {uploading ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[#E8EEF7] border-t-[#1E4D8C] animate-spin" />
            <p className="text-sm text-[#1E4D8C] font-medium">Laddar upp till Google Drive…</p>
          </div>
        ) : results.length > 0 ? (
          <div>
            {results.map(r => (
              <p key={r.name} className={`text-xs ${r.ok ? "text-[#2D7A4F]" : "text-[#B52A2A]"}`}>
                {r.ok ? "✓" : "✗"} {r.name}
              </p>
            ))}
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-[#1A1916] mb-0.5">Dra och släpp filer för att ladda upp till Google Drive</p>
            <p className="text-xs text-[#7A7870]">Filer sparas i <code>/VA-Projekt/{projectName}/</code></p>
          </div>
        )}
      </div>
    </div>
  );
}
