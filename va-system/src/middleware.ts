// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()  { return request.cookies.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Admin routes → redirect to login if not authenticated
  const adminRoutes = ["/dashboard", "/projects", "/contacts", "/cases", "/email", "/documents"];
  if (adminRoutes.some(r => path.startsWith(r)) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Customer portal → redirect to portal login
  if (path.startsWith("/portal/project") && !user) {
    return NextResponse.redirect(new URL("/portal/login", request.url));
  }

  // Already logged in → skip login pages
  if (user && (path === "/login" || path === "/portal/login")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    return NextResponse.redirect(
      new URL(profile?.role === "customer" ? "/portal" : "/dashboard", request.url)
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
