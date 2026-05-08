// src/app/api/onedrive/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGraphToken, uploadFileToProject } from "@/lib/onedrive";

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
    .select("value").eq("key", "onedrive_refresh_token").single();

  if (!setting?.value) {
    return NextResponse.json({ error: "OneDrive not connected" }, { status: 403 });
  }

  try {
    const token      = await getGraphToken(setting.value);
    const buffer     = await file.arrayBuffer();
    const odFile     = await uploadFileToProject(token, projectName, file.name, buffer, file.type);

    // Also record in Supabase documents table
    await sb.from("documents").insert({
      project_id:       projectId,
      name:             file.name,
      storage_path:     odFile.webUrl,  // Use webUrl as path for OneDrive files
      mime_type:        file.type,
      size_bytes:       file.size,
      category:         "OneDrive",
      uploaded_by:      user.id,
      uploaded_by_name: user.email,
      source:           "onedrive",
      onedrive_item_id: odFile.id,
    });

    return NextResponse.json(odFile);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
