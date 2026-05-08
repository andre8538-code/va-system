// src/lib/onedrive.ts
// Microsoft Graph API – OneDrive-integration
// Docs: https://learn.microsoft.com/en-us/graph/api/resources/driveitem

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

// ─── Types ────────────────────────────────────────────────────
export interface OneDriveFile {
  id:           string;
  name:         string;
  size:         number;
  webUrl:       string;
  downloadUrl?: string;
  lastModified: string;
  mimeType:     string;
  isFolder:     boolean;
  parentPath:   string;
}

export interface OneDriveFolder {
  id:   string;
  name: string;
  path: string;
}

// ─── Token management (server-side only) ─────────────────────
export async function getGraphToken(refreshToken: string): Promise<string> {
  const params = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    grant_type:    "refresh_token",
    refresh_token: refreshToken,
    scope:         "Files.ReadWrite.All offline_access",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID ?? "common"}/oauth2/v2.0/token`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? "Token refresh failed");
  return data.access_token;
}

// ─── Graph API helper ─────────────────────────────────────────
async function graph(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Graph API error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── Folder operations ────────────────────────────────────────

// Get or create a project folder in OneDrive
// Structure: /VA-Projekt/{projectName}/
export async function getOrCreateProjectFolder(
  token: string,
  projectName: string
): Promise<OneDriveFolder> {
  const rootFolder = "VA-Projekt";

  // Ensure root folder exists
  await graph(`/me/drive/root/children`, token, {
    method: "POST",
    body: JSON.stringify({
      name:   rootFolder,
      folder: {},
      "@microsoft.graph.conflictBehavior": "fail",
    }),
  }).catch(() => {}); // ignore if exists

  // Ensure project subfolder exists
  const folder = await graph(`/me/drive/root:/${rootFolder}/${projectName}`, token, {
    method: "PUT",
    body: JSON.stringify({
      name:   projectName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "fail",
    }),
  }).catch(async () => {
    // Already exists – fetch it
    return graph(`/me/drive/root:/${rootFolder}/${projectName}`, token);
  });

  return {
    id:   folder.id,
    name: folder.name,
    path: `/${rootFolder}/${projectName}`,
  };
}

// ─── File listing ─────────────────────────────────────────────
export async function listProjectFiles(
  token: string,
  projectName: string
): Promise<OneDriveFile[]> {
  const rootFolder = "VA-Projekt";
  let items: any[] = [];

  try {
    const data = await graph(
      `/me/drive/root:/${rootFolder}/${projectName}:/children?$select=id,name,size,webUrl,lastModifiedDateTime,file,folder,parentReference&$orderby=lastModifiedDateTime desc`,
      token
    );
    items = data?.value ?? [];
  } catch {
    return []; // folder doesn't exist yet
  }

  return items.map((item: any) => ({
    id:           item.id,
    name:         item.name,
    size:         item.size ?? 0,
    webUrl:       item.webUrl,
    downloadUrl:  item["@microsoft.graph.downloadUrl"],
    lastModified: item.lastModifiedDateTime?.slice(0, 10) ?? "",
    mimeType:     item.file?.mimeType ?? "folder",
    isFolder:     !!item.folder,
    parentPath:   item.parentReference?.path ?? "",
  }));
}

// ─── File upload ──────────────────────────────────────────────
export async function uploadFileToProject(
  token: string,
  projectName: string,
  fileName: string,
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<OneDriveFile> {
  const rootFolder  = "VA-Projekt";
  const encodedPath = encodeURIComponent(`${rootFolder}/${projectName}/${fileName}`);

  // Simple upload (< 4 MB). For larger files, use resumable upload.
  const item = await graph(
    `/me/drive/root:/${encodedPath}:/content`,
    token,
    {
      method:  "PUT",
      headers: { "Content-Type": mimeType },
      body:    fileBuffer,
    }
  );

  return {
    id:           item.id,
    name:         item.name,
    size:         item.size ?? 0,
    webUrl:       item.webUrl,
    downloadUrl:  item["@microsoft.graph.downloadUrl"],
    lastModified: item.lastModifiedDateTime?.slice(0, 10) ?? "",
    mimeType:     item.file?.mimeType ?? mimeType,
    isFolder:     false,
    parentPath:   "",
  };
}

// ─── Download URL (short-lived) ───────────────────────────────
export async function getDownloadUrl(token: string, itemId: string): Promise<string> {
  const item = await graph(`/me/drive/items/${itemId}?select=@microsoft.graph.downloadUrl`, token);
  return item["@microsoft.graph.downloadUrl"] ?? "";
}

// ─── Delete file ─────────────────────────────────────────────
export async function deleteFile(token: string, itemId: string): Promise<void> {
  await graph(`/me/drive/items/${itemId}`, token, { method: "DELETE" });
}

// ─── OAuth flow helpers ───────────────────────────────────────
export function getAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri:  process.env.MICROSOFT_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/onedrive/callback`,
    scope:         "Files.ReadWrite.All offline_access User.Read",
    response_mode: "query",
    state:         state ?? "",
  });
  return `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID ?? "common"}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string; refresh_token: string; expires_in: number;
}> {
  const params = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    code,
    grant_type:    "authorization_code",
    redirect_uri:  process.env.MICROSOFT_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/onedrive/callback`,
    scope:         "Files.ReadWrite.All offline_access User.Read",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID ?? "common"}/oauth2/v2.0/token`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? "Token exchange failed");
  return data;
}
