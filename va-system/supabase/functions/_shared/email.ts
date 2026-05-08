// supabase/functions/_shared/email.ts
// Gemensamt e-postbibliotek för alla Edge Functions
// Använder Resend (https://resend.com) – gratis upp till 3000 mejl/månad

const RESEND_API = "https://api.resend.com/emails";

export interface EmailPayload {
  to:      string | string[];
  subject: string;
  html:    string;
  replyTo?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY saknas");

  const fromName    = Deno.env.get("EMAIL_FROM_NAME")    ?? "VA Konsult";
  const fromAddress = Deno.env.get("EMAIL_FROM_ADDRESS") ?? "noreply@vakonsult.se";

  const res = await fetch(RESEND_API, {
    method:  "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from:     `${fromName} <${fromAddress}>`,
      to:       Array.isArray(payload.to) ? payload.to : [payload.to],
      subject:  payload.subject,
      html:     payload.html,
      reply_to: payload.replyTo,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Resend fel: ${JSON.stringify(err)}`);
  }
}

// ─── E-postmallar ─────────────────────────────────────────────

const baseStyle = `
  font-family: 'Segoe UI', Arial, sans-serif;
  color: #1A1916;
  background: #F4F3EF;
  padding: 40px 20px;
`;

const cardStyle = `
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #DDDBD6;
  max-width: 540px;
  margin: 0 auto;
  overflow: hidden;
`;

function header(title: string): string {
  return `
    <div style="background:#1E4D8C;padding:28px 32px;">
      <p style="color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 4px;">VA Konsult</p>
      <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0;">${title}</h1>
    </div>
  `;
}

function button(label: string, href: string): string {
  return `
    <a href="${href}" style="display:inline-block;background:#1E4D8C;color:#ffffff;
      padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
      ${label}
    </a>
  `;
}

function footer(): string {
  return `
    <div style="padding:20px 32px;border-top:1px solid #DDDBD6;background:#F4F3EF;">
      <p style="font-size:12px;color:#A8A49A;margin:0;">
        Detta är ett automatiskt meddelande från VA Ärendehantering. Svara inte på detta mejl.
      </p>
    </div>
  `;
}

// Mall: Försenat ärende
export function overdueTemplate(data: {
  recipientName: string;
  cases: { title: string; deadline: string; projectName: string; priority: string }[];
  appUrl: string;
}): string {
  const caseRows = data.cases.map(c => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #EEECEA;">
        <p style="margin:0;font-size:14px;font-weight:600;">${c.title}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#7A7870;">${c.projectName}</p>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #EEECEA;text-align:right;white-space:nowrap;">
        <span style="font-size:11px;font-weight:700;color:#B52A2A;background:#FAE8E8;padding:2px 8px;border-radius:10px;">
          ${c.priority}
        </span>
        <p style="margin:4px 0 0;font-size:12px;color:#B52A2A;">Deadline: ${c.deadline}</p>
      </td>
    </tr>
  `).join("");

  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        ${header("⚠ Försenade ärenden")}
        <div style="padding:28px 32px;">
          <p style="font-size:15px;margin:0 0 20px;">Hej ${data.recipientName},</p>
          <p style="font-size:14px;color:#5A5850;margin:0 0 20px;">
            Följande ärenden har passerat sin deadline och behöver åtgärdas:
          </p>
          <table style="width:100%;border-collapse:collapse;">${caseRows}</table>
          <div style="margin-top:28px;">${button("Gå till ärenden", `${data.appUrl}/cases`)}</div>
        </div>
        ${footer()}
      </div>
    </div>
  `;
}

// Mall: Ärendeuppdatering
export function caseUpdateTemplate(data: {
  recipientName: string;
  caseTitle: string;
  projectName: string;
  newStatus: string;
  updatedBy: string;
  description?: string;
  caseUrl: string;
}): string {
  const STATUS_COLOR: Record<string, string> = {
    "Öppen":    "#3A6DB5",
    "Pågående": "#B5620A",
    "Stängd":   "#2D7A4F",
  };
  const color = STATUS_COLOR[data.newStatus] ?? "#5A5850";

  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        ${header("Ärendeuppdatering")}
        <div style="padding:28px 32px;">
          <p style="font-size:15px;margin:0 0 20px;">Hej ${data.recipientName},</p>
          <div style="background:#F4F3EF;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
            <p style="font-size:11px;font-weight:700;color:#7A7870;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Ärende</p>
            <p style="font-size:16px;font-weight:700;margin:0 0 4px;">${data.caseTitle}</p>
            <p style="font-size:13px;color:#7A7870;margin:0;">📁 ${data.projectName}</p>
          </div>
          <p style="font-size:14px;margin:0 0 12px;">
            Status ändrad till
            <strong style="color:${color};background:${color}22;padding:2px 10px;border-radius:10px;margin-left:6px;">
              ${data.newStatus}
            </strong>
            av ${data.updatedBy}.
          </p>
          ${data.description ? `<p style="font-size:14px;color:#5A5850;margin:0 0 20px;">${data.description}</p>` : ""}
          <div style="margin-top:24px;">${button("Öppna ärendet", data.caseUrl)}</div>
        </div>
        ${footer()}
      </div>
    </div>
  `;
}

// Mall: Nytt meddelande i kundportalen
export function newMessageTemplate(data: {
  recipientName: string;
  senderName: string;
  projectName: string;
  messagePreview: string;
  portalUrl: string;
}): string {
  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        ${header("Nytt meddelande")}
        <div style="padding:28px 32px;">
          <p style="font-size:15px;margin:0 0 20px;">Hej ${data.recipientName},</p>
          <p style="font-size:14px;color:#5A5850;margin:0 0 16px;">
            ${data.senderName} har skickat ett meddelande i projektet <strong>${data.projectName}</strong>:
          </p>
          <div style="background:#F4F3EF;border-left:3px solid #1E4D8C;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
            <p style="font-size:14px;color:#1A1916;margin:0;font-style:italic;">"${data.messagePreview}"</p>
          </div>
          ${button("Svara i portalen", data.portalUrl)}
        </div>
        ${footer()}
      </div>
    </div>
  `;
}

// Mall: Inbjudan till kundportal
export function inviteTemplate(data: {
  recipientName: string;
  projectName: string;
  consultantName: string;
  inviteUrl: string;
}): string {
  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        ${header("Du är inbjuden till projektportalen")}
        <div style="padding:28px 32px;">
          <p style="font-size:15px;margin:0 0 20px;">Hej ${data.recipientName},</p>
          <p style="font-size:14px;color:#5A5850;margin:0 0 16px;">
            ${data.consultantName} har bjudit in dig till projektportalen för:
          </p>
          <div style="background:#E8EEF7;border-radius:10px;padding:16px 20px;margin-bottom:20px;text-align:center;">
            <p style="font-size:18px;font-weight:700;color:#1E4D8C;margin:0;">${data.projectName}</p>
          </div>
          <p style="font-size:14px;color:#5A5850;margin:0 0 24px;">
            I portalen kan du följa projektets framsteg, se ärenden, hantera dokument och kommunicera direkt med din konsult.
          </p>
          ${button("Skapa konto & logga in", data.inviteUrl)}
          <p style="font-size:12px;color:#A8A49A;margin:20px 0 0;">
            Länken är personlig och unik. Dela den inte med andra.
          </p>
        </div>
        ${footer()}
      </div>
    </div>
  `;
}
