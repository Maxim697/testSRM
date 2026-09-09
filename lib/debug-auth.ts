import type { Profile } from "@/lib/types";

/**
 * Local-only auth bypass for debugging — never active in a deployed build.
 *
 * Set NEXT_PUBLIC_DEBUG_NO_AUTH=true in your own .env.local (never in
 * Vercel's project environment variables, and .env* is gitignored so it
 * can't reach a deploy through git either) to skip login entirely and
 * render every page as a fake admin user. Guarded three ways so it can
 * never accidentally go live: the env var itself, NODE_ENV !== "production"
 * (Next.js sets this for every deployed build), and !process.env.VERCEL
 * (Vercel sets this on every build it runs, regardless of NODE_ENV).
 */
export function isDebugNoAuth(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEBUG_NO_AUTH === "true" &&
    process.env.NODE_ENV !== "production" &&
    !process.env.VERCEL
  );
}

export const DEBUG_USER_ID = "00000000-0000-0000-0000-000000000debug";

export const DEBUG_PROFILE: Profile = {
  id: DEBUG_USER_ID,
  full_name: "Debug Admin",
  telegram: null,
  role: "admin",
  is_active: true,
};
