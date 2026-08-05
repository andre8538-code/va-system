// src/app/api/googledrive/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGraphToken, uploadFileToProject } from "@/lib/googledrive";
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form        = await req.formData();
  const file        = form.get("file") as File;
  const projectId   = form.get("projectId") as string;
  const projectName = form.get("projectName") as string;
  if (!file || !projectId || !projectName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  // Get stored refresh token
  const { data: setting } = await sb.from("settings")
    .select("value").eq("key", "googledrive_refresh_token").single();
  if (!setting?.value) {
    return NextResponse.json({ error: "Google Drive not connected" }, { status: 403 });
  }
  try {
    const token      = await getGraphToken(setting.value);
    const buffer     = await file.arrayBuffer();
    const gdFile     = await uploadFileToProject(token, projectName, file.name, buffer, file.type);
    // Also record in Supabase documents table
    // OBS: återanvänder kolumnen onedrive_item_id för Google Drive-filens ID,
    // för att slippa en ny databas-migration. Fungerar precis lika bra,
    // bara lite missvisande kolumnnamn - kan döpas om senare vid behov.
    await sb.from("documents").insert({
      project_id:       projectId,
      name:             file.name,
      storage_path:     gdFile.webUrl,
      mime_type:        file.type,
      size_bytes:       file.size,
      category:         "Google Drive",
      uploaded_by:      user.id,
      uploaded_by_name: user.email,
      source:           "googledrive",
      onedrive_item_id: gdFile.id,
    });
    return NextResponse.json(gdFile);
} catch (e: any) {
     console.error("Google Drive-uppladdning misslyckades:", e.message);
     return NextResponse.json({ error: e.message }, { status: 500 });
   }
}
