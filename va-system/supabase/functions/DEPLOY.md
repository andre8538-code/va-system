# Edge Functions – Driftsättning

## Förutsättningar

```bash
npm install -g supabase
supabase login
supabase link --project-ref DITT_PROJEKT_ID
```

---

## 1. Resend – e-posttjänst

1. Skapa konto på https://resend.com (gratis: 3 000 mejl/månad)
2. Skapa en API-nyckel under Settings → API Keys
3. Verifiera din avsändardomän under Domains

---

## 2. Miljövariabler i Supabase

Supabase Dashboard → Settings → Edge Functions → Secrets:

```
RESEND_API_KEY          = re_xxxxxxxxxxxx
EMAIL_FROM_NAME         = VA Konsult
EMAIL_FROM_ADDRESS      = noreply@din-domän.se
NEXT_PUBLIC_APP_URL     = https://din-app.vercel.app
CRON_SECRET             = ett-slumpmässigt-hemligt-lösenord
SUPABASE_WEBHOOK_SECRET = ett-annat-hemligt-lösenord
```

Alternativt via CLI:
```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set EMAIL_FROM_NAME="VA Konsult"
supabase secrets set EMAIL_FROM_ADDRESS=noreply@din-domän.se
supabase secrets set NEXT_PUBLIC_APP_URL=https://din-app.vercel.app
supabase secrets set CRON_SECRET=ditt-hemliga-lösenord
supabase secrets set SUPABASE_WEBHOOK_SECRET=ditt-webhook-lösenord
```

---

## 3. Deploya alla Functions

```bash
cd va-system

supabase functions deploy notify-overdue      --no-verify-jwt
supabase functions deploy notify-case-update  --no-verify-jwt
supabase functions deploy notify-new-message  --no-verify-jwt
supabase functions deploy send-invite
```

> `--no-verify-jwt` krävs för webhook-triggade functions som inte har Supabase-JWT.

---

## 4. Sätt upp Database Webhooks

Supabase Dashboard → Database → Webhooks → Create a new hook:

### Webhook 1: notify-case-update
| Fält | Värde |
|------|-------|
| Name | notify-case-update |
| Table | cases |
| Events | ☑ UPDATE |
| URL | `https://PROJEKT_ID.supabase.co/functions/v1/notify-case-update` |
| HTTP Headers | `x-supabase-signature: ditt-webhook-lösenord` |

### Webhook 2: notify-new-message
| Fält | Värde |
|------|-------|
| Name | notify-new-message |
| Table | messages |
| Events | ☑ INSERT |
| URL | `https://PROJEKT_ID.supabase.co/functions/v1/notify-new-message` |
| HTTP Headers | `x-supabase-signature: ditt-webhook-lösenord` |

---

## 5. Aktivera pg_cron för dagliga notiser

Supabase Dashboard → Database → Extensions → aktivera **pg_cron**

Kör sedan SQL från `05_functions_setup.sql` (avkommentera SELECT cron.schedule-blocket).

---

## 6. Testa lokalt

```bash
# Starta lokal Supabase
supabase start

# Testa overdue-funktion
supabase functions serve notify-overdue
curl -X POST http://localhost:54321/functions/v1/notify-overdue \
  -H "x-cron-secret: ditt-lösenord"

# Testa inbjudningsfunktion
supabase functions serve send-invite
curl -X POST http://localhost:54321/functions/v1/send-invite \
  -H "Authorization: Bearer DIN_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contactId":"uuid","projectId":"uuid"}'
```

---

## Sammanfattning – vilken function gör vad

| Function | Trigger | Skickar till | Innehåll |
|---|---|---|---|
| `notify-overdue` | pg_cron (vardagar 08:00) | Kontakter med försenade ärenden | Lista försenade ärenden med deadline |
| `notify-case-update` | DB Webhook (cases UPDATE) | Kontakten kopplad till ärendet | Ny status + ärendebeskrivning |
| `notify-new-message` | DB Webhook (messages INSERT) | Admin ↔ Kund (beroende på vem skickade) | Meddelandeförhandsvisning + länk |
| `send-invite` | Anropas från Next.js | Kontaktens e-post | Unik inbjudningslänk till kundportalen |
