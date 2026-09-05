import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const getCurrentProfile = cache(async (): Promise<{
  userId: string;
  profile: Profile;
} | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetched separately from is_active (below): these columns have existed
  // since the very first migration, so this lookup — which every page's
  // role/nav gating depends on — can never fail because of a newer, still
  // -unapplied migration on a column it doesn't reference.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, full_name, telegram, role")
    .eq("id", user.id)
    .single();

  // is_active is intentionally a second, best-effort query: if migration
  // 0011 hasn't been run yet, this fails harmlessly and defaults to true
  // (fail open) instead of taking down the role lookup above with it.
  let isActive = true;
  if (profileRow) {
    const { data: activeRow } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (activeRow && typeof activeRow.is_active === "boolean") isActive = activeRow.is_active;
  }

  const profile: Profile = profileRow
    ? { ...profileRow, is_active: isActive }
    : {
        id: user.id,
        full_name: user.email ?? null,
        telegram: null,
        role: "manager",
        is_active: true,
      };

  return { userId: user.id, profile };
});
