"use client";
// src/app/portal/invite/[token]/page.tsx
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function InvitePage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [name, setName]         = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleAccept = async () => {
    if (!name || !password) { setError("Fyll i alla fält."); return; }
    setLoading(true); setError("");
    const sb = createClient();

    // 1. Look up invite to get email
    const { data: invite } = await sb.from("portal_access")
      .select("contacts(email)").eq("invite_token", token).single();
    const email = (invite?.contacts as any)?.email;
    if (!email) { setError("Ogiltig inbjudningslänk."); setLoading(false); return; }

    // 2. Sign up user
    const { error: signupError } = await sb.auth.signUp({
      email, password,
      options: { data: { full_name: name, role: "customer" } },
    });
    if (signupError) { setError(signupError.message); setLoading(false); return; }

    // 3. Sign in and accept invite
    await sb.auth.signInWithPassword({ email, password });
    await sb.from("portal_access")
      .update({ accepted_at: new Date().toISOString() })
      .eq("invite_token", token);

    router.push("/portal");
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-3xl mb-3">👋</p>
          <h1 className="font-display text-2xl font-bold text-[#1C1A16]">Du är inbjuden!</h1>
          <p className="text-sm text-[#7E7A6F] mt-1">Skapa ditt konto för att komma åt din projektportal.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#E4E0D8] p-7 space-y-4">
          <div>
            <label className="label">Ditt namn</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Förnamn Efternamn" />
          </div>
          <div>
            <label className="label">Välj lösenord</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="Minst 6 tecken" />
          </div>
          {error && <p className="text-sm text-[#B83232] bg-[#FAEAEA] rounded-lg px-3 py-2">{error}</p>}
          <button onClick={handleAccept} disabled={loading}
            className="w-full py-3 rounded-xl bg-[#0D6B5E] text-white font-semibold text-sm hover:bg-[#1A8C7C] transition-colors">
            {loading ? "Skapar konto…" : "Skapa konto & logga in"}
          </button>
        </div>
      </div>
    </div>
  );
}
