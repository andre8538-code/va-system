# VA Ärendehantering

Komplett ärendehanteringssystem för VA-konsulter. Byggt med Next.js 15, Supabase och Gmail-integration.

## Snabbstart

### 1. Klona och installera

```bash
# Extrahera zip-filen, sedan:
cd va-system
npm install
```

### 2. Supabase

1. Skapa projekt på https://supabase.com (region: eu-central-1)
2. Gå till **Database → SQL Editor** och kör dessa filer i ordning:
   - `01_schema.sql`
   - `02_rls_storage.sql`
   - `03_seed.sql` (valfritt – exempeldata)

### 3. Miljövariabler

```bash
cp .env.local.example .env.local
```

Fyll i från **Supabase → Settings → API**:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 4. Starta

```bash
npm run dev
# → http://localhost:3000
```

Logga in med det konto du skapar i Supabase Dashboard → Authentication → Users.

---

## Projektstruktur

```
src/
├── app/
│   ├── (admin)/          # Admin-portalen (autoskyddad)
│   │   ├── dashboard/    # Översikt + statistik
│   │   ├── projects/     # Projekt + detaljvy
│   │   │   └── [id]/
│   │   ├── contacts/     # Kontakthantering
│   │   ├── cases/        # Ärendehantering
│   │   ├── email/        # Gmail-integration (live MCP)
│   │   └── documents/    # OneDrive-hantering
│   ├── portal/           # Kundportal
│   │   ├── login/
│   │   ├── invite/[token]/
│   │   └── project/[id]/
│   ├── login/            # Admin-inloggning
│   └── api/
│       ├── gmail/send/   # Server-side Gmail-svar
│       └── documents/upload/
├── lib/supabase/
│   ├── client.ts         # Browser-klient
│   ├── server.ts         # Server-klient (SSR)
│   ├── queries.ts        # Alla databasanrop
│   └── types.ts          # TypeScript-typer
├── components/admin/
│   └── Sidebar.tsx
└── middleware.ts          # Auth-skydd på routes
```

---

## Funktioner

| Modul         | Status | Beskrivning                                      |
|---------------|--------|--------------------------------------------------|
| Dashboard     | ✅     | Statistik, öppna ärenden, försenade projekt      |
| Projekt       | ✅     | CRUD, milstolpar, kontakter, dokument            |
| Kontakter     | ✅     | CRM med roller, projektkopplingar                |
| Ärenden       | ✅     | Prioritet, status, deadline, kontaktkoppling     |
| E-post        | ✅     | Gmail-integration via MCP, koppla till projekt   |
| OneDrive      | 🔜     | Microsoft Graph API (nästa steg)                 |
| Kundportal    | ✅     | Inloggning, projektstatus, dokument, chatt       |
| Inbjudningar  | ✅     | Unik token-länk per kontakt                      |
| Realtime-chatt| ✅     | Supabase Realtime på messages-tabellen           |

---

## Driftsättning på Vercel

```bash
npm i -g vercel
vercel
```

Lägg till miljövariabler i Vercel Dashboard.

Ange i Supabase → Authentication → URL Configuration:
- Site URL: `https://din-app.vercel.app`
- Redirect URLs: `https://din-app.vercel.app/**`

---

## Nästa steg

- [ ] OneDrive-integration via Microsoft Graph API
- [ ] Formulär för att skapa/redigera projekt, ärenden och kontakter
- [ ] E-postnotifikationer för försenade ärenden (Supabase Edge Functions)
- [ ] Milstolpe-redigering i UI
- [ ] PDF-rapportgenerering per projekt
