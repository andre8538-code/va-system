"use client";
// src/app/(admin)/contacts/[id]/DeleteContactButton.tsx
export default function DeleteContactButton({ action }: { action: () => void }) {
  return (
    <form action={action}>
      <button
        type="submit"
        onClick={e => { if (!confirm("Ta bort kontakten?")) e.preventDefault(); }}
        className="text-sm text-[#B52A2A] hover:underline px-2"
      >
        Ta bort
      </button>
    </form>
  );
}
