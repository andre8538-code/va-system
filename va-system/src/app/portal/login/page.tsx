"use client";
// src/app/portal/login/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PortalLogin() {
  const router = useRouter();
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true); setError("");
    const sb = createClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setError("Felaktig e-post eller lösenord."); setLoading(false); return; }
    router.push("/portal");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[11px] text-[#0D6B5E] font-bold tracking-[0.1em] uppercase mb-2">VA Konsult</p>
          <h1 className="font-display text-2xl font-bold text-[#1C1A16]">Kundportal</h1>
          <p className="text-sm text-[#7E7A6F] mt-1">Logga in för att komma åt ditt projekt</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#E4E0D8] p-7 space-y-4">
          <div>
            <label className="label">E-postadress</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="input" placeholder="din@email.se"
              onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          <div>
            <label className="label">Lösenord</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="input" placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          {error && <p className="text-sm text-[#B83232] bg-[#FAEAEA] rounded-lg px-3 py-2">{error}</p>}
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3 rounded-xl bg-[#0D6B5E] text-white font-semibold text-sm hover:bg-[#1A8C7C] transition-colors">
            {loading ? "Loggar in…" : "Logga in"}
          </button>
        </div>
        <p className="text-xs text-center text-[#A8A49A] mt-6">
          Administratör?{" "}
          <a href="/login" className="text-[#0D6B5E] hover:underline">Logga in här →</a>
        </p>
      </div>
    </div>
  );
}
