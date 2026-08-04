// src/lib/googledrive.ts
//
// Google Drive-integration. Ersätter Microsoft Graph-varianten (onedrive.ts)
// eftersom Azure krävde en betald licens för personliga konton, medan Google
// Cloud OAuth är gratis för den här typen av koppling.
//
// Samma arkitektur som OneDrive-varianten skulle haft:
// - OAuth Authorization Code Grant, refresh token sparas i `settings`-tabellen
//   (key = 'googledrive_refresh_token')
// - Mappstruktur: /VA-Projekt/{projektnamn}/{timestamp}_{filnamn}
// - Vid varje API-anrop hämtas en ny access token via refresh token

import { createClient } from "@/lib/supabase/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/googledrive/callback`;

const ROOT_FOLDER_NAME = "VA-Projekt";

// ---------- OAuth: steg 1, generera inloggningslänk ----------

export function getGoogleAuthUrl() {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline", // krävs för att få tillbaka en refresh_token
    prompt: "consent", // tvingar fram refresh_token varje gång (annars ges den bara första gången)
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ---------- OAuth: steg 2, byt "code" mot tokens ----------

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kunde inte hämta tokens från Google: ${text}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

// ---------- Hämta en färsk access token via sparad refresh token ----------

async function getAccessToken(): Promise<string> {
  const supabase = await createClient();
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "googledrive_refresh_token")
    .maybeSingle();

  if (!setting?.value) {
    throw new Error(
      "Google Drive är inte anslutet ännu. Gå till Dokument-sidan och klicka 'Anslut Google Drive'."
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: setting.value,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kunde inte förnya access token: ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// ---------- Hitta eller skapa en mapp ----------

async function findOrCreateFolder(
  name: string,
  parentId: string | null,
  accessToken: string
): Promise<string> {
  const parentQuery = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents";
  const q = encodeURIComponent(
    `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentQuery}`
  );

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Mappen finns inte - skapa den
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });

  const createData = await createRes.json();
  return createData.id;
}

export async function getOrCreateProjectFolder(projectName: string): Promise<string> {
  const accessToken = await getAccessToken();
  const rootId = await findOrCreateFolder(ROOT_FOLDER_NAME, null, accessToken);
  const projectFolderId = await findOrCreateFolder(projectName, rootId, accessToken);
  return projectFolderId;
}

// ---------- Ladda upp en fil ----------

export async function uploadDocument(
  projectName: string,
  filename: string,
  fileBuffer: Buffer,
  mimeType: string
) {
  const accessToken = await getAccessToken();
  const folderId = await getOrCreateProjectFolder(projectName);

  const timestampedName = `${Date.now()}_${filename}`;

  const metadata = {
    name: timestampedName,
    parents: [folderId],
  };

  const boundary = "va_system_boundary";
  const multipartBody = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
        metadata
      )}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Uppladdning till Google Drive misslyckades: ${text}`);
  }

  return res.json() as Promise<{ id: string; webViewLink: string }>;
}

