"use client";
// src/app/login/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    setLoading(true); setError("");
    const sb = createClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-5/12 bg-[#161513] flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full border border-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-24 -left-12 w-48 h-48 rounded-full border border-white/5" />
        <div>
          <p className="text-[11px] text-white/35 tracking-[0.12em] uppercase font-bold mb-4">VA Konsult</p>
          <h1 className="font-display text-3xl text-white font-bold leading-snug mb-5">
            Ärendehantering<br />för VA-konsulter
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs">
            Hantera projekt, ärenden, kontakter och dokument – allt samlat med Gmail och OneDrive integrerat.
          </p>
        </div>
        <div className="space-y-3">
          {["15–30 aktiva projekt","Gmail-integration","Kundportal per projekt","OneDrive-dokument"].map(t => (
            <div key={t} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/60">✓</div>
              <span className="text-sm text-white/55">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F4F3EF]">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-bold text-[#1A1916] mb-1">Logga in</h2>
          <p className="text-sm text-[#7A7870] mb-8">Ange dina uppgifter för att fortsätta.</p>

          <div className="space-y-4">
            <div>
              <label className="label">E-postadress</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="din@email.se" className="input"
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div>
              <label className="label">Lösenord</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className="input"
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>

            {error && <p className="text-sm text-[#B52A2A] bg-[#FAE8E8] px-3 py-2 rounded-lg">{error}</p>}

            <button onClick={handleLogin} disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? "Loggar in…" : "Logga in"}
            </button>
          </div>

          <p className="text-xs text-[#A8A49A] text-center mt-8">
            Kundportal?{" "}
            <a href="/portal/login" className="text-[#1E4D8C] hover:underline">Logga in här →</a>
          </p>
        </div>
      </div>
    </div>
  );
}
