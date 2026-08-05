// src/app/api/googledrive/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGraphToken, trashFile } from "@/lib/googledrive";

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await req.json();
  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
  }

  const { data: setting } = await sb.from("settings")
    .select("value").eq("key", "googledrive_refresh_token").single();
  if (!setting?.value) {
    return NextResponse.json({ error: "Google Drive not connected" }, { status: 403 });
  }

  try {
    const token = await getGraphToken(setting.value);
    await trashFile(token, fileId);

    // Ta bort motsvarande rad i documents-tabellen (matchas via filens Drive-ID)
    await sb.from("documents").delete().eq("onedrive_item_id", fileId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Radering av fil misslyckades:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
