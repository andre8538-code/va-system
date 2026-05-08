// src/app/api/auth/signout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const sb = await createClient();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/portal/login", req.url));
}
