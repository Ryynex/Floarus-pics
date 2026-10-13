import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, hasUsableToken } from "@/lib/authCookie";

/**
 * Route protection (Next 16 "proxy" convention; formerly middleware.ts).
 *
 * Stage 1 (cheap, no network): the access-token cookie must exist and not be
 * expired, otherwise the visitor is bounced to the landing page.
 * Stage 2 (admin only): the token is verified against Supabase's Auth REST
 * endpoint and the caller must own a `profiles.is_admin = true` row. Neither
 * check can be satisfied by editing localStorage, which is what every previous
 * client-side gate relied on.
 *
 * Supabase is called with plain fetch (not supabase-js) to stay clear of the
 * Edge Runtime and keep this proxy dependency-free.
 */

function redirectToLanding(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  const response = NextResponse.redirect(url);
  response.cookies.delete(AUTH_COOKIE);
  return response;
}

async function isAdminToken(token: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return false; // fail closed

  try {
    // 1. Verify the JWT with Supabase (signature checked server-side).
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
      cache: "no-store",
    });
    if (!userRes.ok) return false;
    const user = await userRes.json();
    if (!user?.id) return false;

    // 2. Check the admin flag (RLS: only admins can read other profiles).
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=is_admin`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
          Range: "0-0",
        },
        cache: "no-store",
      }
    );
    if (!profileRes.ok) return false;
    const rows = await profileRes.json();
    return rows?.[0]?.is_admin === true;
  } catch (err) {
    console.error("Admin verification failed:", err);
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE)?.value ?? null;

  if (!hasUsableToken(token)) {
    return redirectToLanding(req);
  }

  if (pathname.startsWith("/god/html/admin")) {
    const allowed = await isAdminToken(token);
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Keep this list explicit: the proxy must never run for static assets,
  // API routes, or Next internals.
  matcher: ["/dashboard/:path*", "/god/html/admin/:path*"],
};
