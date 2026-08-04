// src/app/api/auth/googledrive/callback/route.ts
//
// Google redirectar hit efter att du godkänt åtkomst.
// Byter "code" mot access/refresh-tokens och sparar refresh_token i settings-tabellen.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/googledrive";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (error) {
    return NextResponse.redirect(`${appUrl}/documents?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${appUrl}/documents?error=missing_code`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      // Google ger bara refresh_token vid FÖRSTA godkännandet. Om den saknas
      // (t.ex. vid omanslutning): återkalla appens åtkomst i Google-kontot
      // (myaccount.google.com/permissions) och anslut på nytt.
      return NextResponse.redirect(`${appUrl}/documents?error=no_refresh_token`);
    }

    const supabase = await createClient();

   const {
     data: { user },
   } = await supabase.auth.getUser();

   const { error: saveError } = await supabase
     .from("settings")
     .upsert(
       {
         key: "googledrive_refresh_token",
         value: tokens.refresh_token,
         user_id: user?.id,
       },
       { onConflict: "key" }
     );

   if (saveError) {
     console.error("Kunde inte spara Google Drive-token:", saveError);
     return NextResponse.redirect(
       `${appUrl}/documents?error=${encodeURIComponent(saveError.message)}`
     );
   }

   return NextResponse.redirect(`${appUrl}/documents?connected=1`);

    return NextResponse.redirect(`${appUrl}/documents?connected=1`);
  } catch (err) {
    console.error("Google Drive OAuth-callback misslyckades:", err);
    const message = err instanceof Error ? err.message : "Okänt fel";
    return NextResponse.redirect(`${appUrl}/documents?error=${encodeURIComponent(message)}`);
  }
}
