"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { clearAuthCookie, setAuthCookie } from "@/lib/authCookie";

/**
 * Keeps the routing cookie in sync with the Supabase session so
 * `middleware.ts` can gate /dashboard and the admin route before rendering.
 *
 * Runs once on mount (covers users who were already signed in before this
 * cookie existed) and then on every auth event.
 */
export default function AuthCookieSync() {
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.access_token) {
          setAuthCookie(session.access_token);
        } else {
          clearAuthCookie();
        }
      } catch (err) {
        console.error("Auth cookie sync failed:", err);
      }
    };

    sync();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        setAuthCookie(session.access_token);
      } else {
        clearAuthCookie();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
