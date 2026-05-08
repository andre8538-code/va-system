"use client";
// src/app/portal/project/[id]/documents/DocumentUploader.tsx
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function DocumentUploader({ projectId }: { projectId: string }) {
  const [dragOver, setDragOver]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone]           = useState<string[]>([]);
  const [error, setError]         = useState("");
  const inputRef                  = useRef<HTMLInputElement>(null);
  const router                    = useRouter();

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true); setError("");
    const uploaded: string[] = [];

    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("projectId", projectId);
      form.append("category", "Uppladdad");

      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      if (res.ok) uploaded.push(file.name);
      else setError(`Kunde inte ladda upp ${file.name}`);
    }

    setDone(uploaded);
    setUploading(false);
    if (uploaded.length) { router.refresh(); setTimeout(() => setDone([]), 3000); }
  };

  return (
    <div className="mb-6">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); upload(Array.from(e.dataTransfer.files)); }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-all
          ${dragOver ? "border-[#0D6B5E] bg-[#E6F3F1]" : "border-[#E4E0D8] bg-white hover:border-[#0D6B5E]/50"}`}>

        <input ref={inputRef} type="file" multiple className="hidden"
          onChange={e => upload(Array.from(e.target.files ?? []))} />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-[#E6F3F1] border-t-[#0D6B5E] animate-spin" />
            <p className="text-sm text-[#0D6B5E] font-medium">Laddar upp…</p>
          </div>
        ) : done.length > 0 ? (
          <div>
            <p className="text-2xl mb-1">✅</p>
            <p className="text-sm font-semibold text-[#2A7A50]">{done.length} fil{done.length > 1 ? "er" : ""} uppladdad{done.length > 1 ? "e" : ""}</p>
            <p className="text-xs text-[#A8A49A] mt-1">{done.join(", ")}</p>
          </div>
        ) : (
          <div>
            <p className="text-3xl mb-2">☁</p>
            <p className="text-sm font-semibold text-[#1C1A16] mb-0.5">Dra och släpp filer här</p>
            <p className="text-xs text-[#A8A49A]">eller klicka för att välja filer</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-[#B83232] mt-2">{error}</p>}
    </div>
  );
}
