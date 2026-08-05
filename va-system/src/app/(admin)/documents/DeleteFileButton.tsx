"use client";
// src/app/(admin)/documents/DeleteFileButton.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteFileButton({ fileId, fileName }: {
  fileId: string; fileName: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Radera "${fileName}"? Filen flyttas till papperskorgen i Google Drive.`)) {
      return;
    }
    setDeleting(true);
    const res = await fetch("/api/googledrive/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Kunde inte radera filen: ${data.error ?? "okänt fel"}`);
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs text-[#B52A2A] hover:underline px-2 py-1.5 disabled:opacity-50"
    >
      {deleting ? "Raderar…" : "🗑 Radera"}
    </button>
  );
}
