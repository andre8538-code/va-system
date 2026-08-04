"use client";

import { useState } from "react";

export default function Sidebar() {
  const [open, setOpen] = useState(false);

 const links = [
     { href: "/dashboard", label: "Dashboard" },
     { href: "/projects", label: "Projekt" },
     { href: "/cases", label: "Ärenden" },
     { href: "/contacts", label: "Kontakter" },
     { href: "/documents", label: "☁ OneDrive" },
     { href: "/email", label: "✉ E-post" },
   ];

  return (
    <>
      {/* Hamburgerknapp - syns bara på mobil (md:hidden) */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 bg-[#1A1916] text-white p-2 rounded"
        aria-label="Öppna meny"
      >
        ☰
      </button>

      {/* Overlay bakom menyn på mobil, stänger menyn vid klick */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Själva menyn:
          - Mobil: fast positionerad, glider in/ut, ligger ovanpå innehållet
          - Desktop (md:): vanlig permanent sidomeny som förut */}
      <aside
        className={`
          fixed md:static top-0 left-0 h-full w-64 bg-[#1A1916] text-white p-4 z-50
          transform transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        `}
      >
        <nav>
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 rounded hover:bg-white/10"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
