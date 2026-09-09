import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isDebugNoAuth, DEBUG_USER_ID, DEBUG_PROFILE } from "@/lib/debug-auth";
import type { Profile } from "@/lib/types";

/** The authenticated Supabase user (or the fake debug one) — split out
 * from getCurrentProfile() so a caller that also needs something else
 * keyed by user id (e.g. the dashboard layout's notifications query) can
 * resolve this once and fan out from there with Promise.all, instead of
 * every dependent query queuing up behind the *entire* getCurrentProfile()
 * (which used to mean two extra sequential round trips before a caller
 * even learned the user's id). React's cache() means a second call to
 * this same function within the request reuses this exact result — no
 * duplicate network call — so getCurrentProfile() below can freely call
 * this too without any double-fetch cost. */
export const getAuthUser = cache(async (): Promise<{ id: string; email: string | null } | null> => {
  if (isDebugNoAuth()) return { id: DEBUG_USER_ID, email: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { id: user.id, email: user.email ?? null } : null;
});

/** The profile row for a given user id — also its own cache() entry, so
 * callers that already resolved getAuthUser() themselves (see above) can
 * fetch this in parallel with other user-id-keyed queries. `fallbackEmail`
 * only matters for the (rare) case of an authenticated user with no
 * `profiles` row yet — it becomes the displayed name instead of null. */
export const getProfileForUser = cache(async (userId: string, fallbackEmail: string | null = null): Promise<Profile> => {
  if (userId === DEBUG_USER_ID) return DEBUG_PROFILE;

  const supabase = await createClient();

  // is_active lives in the same row and same query now — it used to be a
  // second, separate round trip ("in case migration 0011 hasn't run yet"),
  // but 0011 has been applied for a while now (0012, notifications, is
  // already live and depends on the migrations before it having run), so
  // that defensive split no longer earns its cost: one full extra
  // Supabase round trip on every single page load in the app.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, full_name, telegram, role, is_active")
    .eq("id", userId)
    .single();

  return profileRow
    ? (profileRow as Profile)
    : {
        id: userId,
        full_name: fallbackEmail,
        telegram: null,
        role: "manager",
        is_active: true,
      };
});

export const getCurrentProfile = cache(async (): Promise<{
  userId: string;
  profile: Profile;
} | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const profile = await getProfileForUser(user.id, user.email);
  return { userId: user.id, profile };
});
