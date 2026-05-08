// src/app/api/auth/onedrive/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/onedrive";

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/documents?error=onedrive_denied", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // Store refresh token securely in Supabase (encrypted in a settings table)
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/login", req.url));

    // Upsert into a settings table (create with SQL: CREATE TABLE settings (key text primary key, value text, user_id uuid))
    await sb.from("settings").upsert({
      key:     "onedrive_refresh_token",
      value:   tokens.refresh_token,
      user_id: user.id,
    });

    return NextResponse.redirect(new URL("/documents?connected=1", req.url));
  } catch {
    return NextResponse.redirect(new URL("/documents?error=token_exchange", req.url));
  }
}
