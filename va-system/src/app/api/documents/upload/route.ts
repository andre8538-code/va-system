// src/app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file      = form.get("file") as File;
  const projectId = form.get("projectId") as string;
  const category  = (form.get("category") as string) || "Uppladdad";

  if (!file || !projectId) return NextResponse.json({ error: "Missing file or projectId" }, { status: 400 });

  // Upload to Supabase Storage
  const path = `${projectId}/${Date.now()}_${file.name}`;
  const { error: storageError } = await sb.storage.from("project-documents").upload(path, file);
  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 });

  // Create metadata record
  const { data, error } = await sb.from("documents").insert({
    project_id:       projectId,
    name:             file.name,
    storage_path:     path,
    mime_type:        file.type,
    size_bytes:       file.size,
    category,
    uploaded_by:      user.id,
    uploaded_by_name: user.email,
    source:           "portal",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
