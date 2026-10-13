/**
 * Access-token cookie shared by the browser client and `middleware.ts`.
 *
 * Supabase sessions live in localStorage (see `supabaseClient.ts`), which
 * middleware cannot read. The client mirrors just the access token into a
 * cookie here so the server can gate routes before any HTML ships.
 *
 * The cookie is only a cheap pre-filter (presence + `exp` claim); the
 * authoritative check for privileged routes is `auth.getUser()` + the
 * `profiles.is_admin` column, both of which verify the signature server-side.
 */
export const AUTH_COOKIE = "florus_at";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Reads the `exp` claim without verifying the signature (cheap bounce only). */
export function isJwtExpired(token: string, skewSeconds = 60): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const claims: unknown = JSON.parse(atob(padded));
    const exp = (claims as { exp?: unknown }).exp;
    if (typeof exp !== "number") return true;
    return exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}

/** True when the cookie carries a token that is present and not yet expired. */
export function hasUsableToken(token: string | null | undefined): token is string {
  return Boolean(token) && !isJwtExpired(token as string);
}

/** Browser-only: mirror the current access token into the routing cookie. */
export function setAuthCookie(token: string): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

/** Browser-only: drop the routing cookie (sign-out / expired session). */
export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
