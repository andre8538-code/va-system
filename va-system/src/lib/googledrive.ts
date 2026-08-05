// src/lib/googledrive.ts
//
// Google Drive-integration - ersätter Microsoft Graph-varianten (onedrive.ts).
// Funktionsnamnen matchar medvetet onedrive.ts (getGraphToken, listProjectFiles,
// getAuthUrl, uploadFileToProject) så att de filer som använder biblioteket bara
// behöver byta importrad, inte sin egen logik.
//
// Mappstruktur i Drive: /VA-Projekt/{projektnamn}/{timestamp}_{filnamn}
// Refresh token sparas i settings-tabellen (key='googledrive_refresh_token')

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/googledrive/callback`;

const ROOT_FOLDER_NAME = "VA-Projekt";

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  lastModified: string;
  webUrl: string;
  downloadUrl?: string;
  isFolder: boolean;
};

// ---------- OAuth: steg 1, generera inloggningslänk ----------

export function getAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline", // krävs för att få tillbaka en refresh_token
    prompt: "consent", // tvingar fram refresh_token varje gång
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ---------- OAuth: steg 2, byt "code" mot tokens (körs i callback-rutten) ----------

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
    throw new Error(`Kunde inte hämta tokens från Google: ${await res.text()}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

// ---------- Byt en sparad refresh token mot en färsk access token ----------

export async function getGraphToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Kunde inte förnya access token: ${await res.text()}`);
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
  const parentClause = parentId ? `'${parentId}' in parents` : "'root' in parents";
  const q = encodeURIComponent(
    `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and ${parentClause}`
  );

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.files?.length > 0) {
    return searchData.files[0].id;
  }

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

async function getProjectFolderId(accessToken: string, projectName: string): Promise<string> {
  const rootId = await findOrCreateFolder(ROOT_FOLDER_NAME, null, accessToken);
  return findOrCreateFolder(projectName, rootId, accessToken);
}

// ---------- Lista filer i ett projekts mapp ----------

export async function listProjectFiles(
  accessToken: string,
  projectName: string
): Promise<DriveFile[]> {
  const folderId = await getProjectFolderId(accessToken, projectName);

  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const fields = encodeURIComponent(
    "files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink)"
  );

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Kunde inte lista filer: ${await res.text()}`);
  }

  const data = await res.json();

  return (data.files ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size ? parseInt(f.size, 10) : 0,
    lastModified: f.modifiedTime
      ? new Date(f.modifiedTime).toLocaleDateString("sv-SE")
      : "",
    webUrl: f.webViewLink,
    downloadUrl: f.webContentLink,
    isFolder: f.mimeType === "application/vnd.google-apps.folder",
  }));
}
// ---------- Flytta en fil till papperskorgen (inte permanent radering) ----------

export async function trashFile(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trashed: true }),
  });

  if (!res.ok) {
    throw new Error(`Kunde inte radera filen: ${await res.text()}`);
  }
}
// ---------- Ladda upp en fil ----------

export async function uploadFileToProject(
  accessToken: string,
  projectName: string,
  filename: string,
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<{ id: string; webUrl: string }> {
  const folderId = await getProjectFolderId(accessToken, projectName);
  const timestampedName = `${Date.now()}_${filename}`;

  const metadata = { name: timestampedName, parents: [folderId] };
  const boundary = "va_system_boundary";

  const multipartBody = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
        metadata
      )}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    Buffer.from(fileBuffer),
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
    throw new Error(`Uppladdning till Google Drive misslyckades: ${await res.text()}`);
  }

  const data = await res.json();
  return { id: data.id, webUrl: data.webViewLink };
}
