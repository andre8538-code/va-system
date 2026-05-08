"use client";
// src/app/portal/project/[id]/PortalNav.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PortalNav({ projectId }: { projectId: string }) {
  const path = usePathname();
  const base = `/portal/project/${projectId}`;

  const tabs = [
    { href: base,                  label: "Översikt"     },
    { href: `${base}/cases`,       label: "Ärenden"      },
    { href: `${base}/documents`,   label: "Dokument"     },
    { href: `${base}/messages`,    label: "Meddelanden"  },
  ];

  return (
    <nav className="max-w-3xl mx-auto px-6 flex gap-0.5">
      {tabs.map(tab => {
        const active = tab.href === base ? path === base : path.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${active
                ? "border-[#0D6B5E] text-[#0D6B5E]"
                : "border-transparent text-[#7E7A6F] hover:text-[#1C1A16]"}`}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
