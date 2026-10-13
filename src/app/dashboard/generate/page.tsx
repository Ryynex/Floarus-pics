import { redirect } from "next/navigation";

/**
 * Legacy path: the app has always used `/dashboard?tab=generate`.
 * Anything that still lands here is forwarded instead of rendering a
 * disconnected duplicate of the Studio workspace.
 */
export default function GeneratePage() {
  redirect("/dashboard?tab=generate");
}
