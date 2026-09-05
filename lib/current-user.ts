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

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, full_name, telegram, role")
    .eq("id", user.id)
    .single();

  const profile: Profile = profileRow ?? {
    id: user.id,
    full_name: user.email ?? null,
    telegram: null,
    role: "manager",
  };

  return { userId: user.id, profile };
});
