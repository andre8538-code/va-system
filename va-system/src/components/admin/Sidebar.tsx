"use client";
// src/components/admin/Sidebar.tsx
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard",  icon: "◈", label: "Översikt"   },
  { href: "/projects",   icon: "▦", label: "Projekt"    },
  { href: "/contacts",   icon: "◎", label: "Kontakter"  },
  { href: "/cases",      icon: "◇", label: "Ärenden"    },
  { href: "/email",      icon: "✉", label: "E-post"     },
  { href: "/documents",  icon: "☁", label: "OneDrive"   },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const path   = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const sb = createClient();
    await sb.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-[220px] flex-shrink-0 bg-[#161513] flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 py-7 border-b border-white/8">
        <p className="text-[10px] text-white/30 tracking-[0.12em] uppercase font-bold mb-1">VA Konsult</p>
        <p className="font-display text-[17px] text-white font-bold leading-snug">Ärendehantering</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, icon, label }) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(href));
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active ? "bg-white/12 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/6"}`}>
              <span className="text-[15px] opacity-80">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-white/8">
        <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Inloggad som</p>
        <p className="text-[13px] text-white/60 font-medium truncate mb-3">{userEmail}</p>
        <div className="flex gap-1.5 mb-3">
          {["Gmail", "OneDrive"].map(s => (
            <span key={s} className="text-[9px] px-2 py-0.5 rounded-full bg-white/7 text-white/35 font-bold tracking-wider">{s}</span>
          ))}
        </div>
        <button onClick={handleLogout} className="text-[11px] text-white/25 hover:text-white/50 transition-colors">
          Logga ut →
        </button>
      </div>
    </aside>
  );
}
