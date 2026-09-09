import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

/** The manager list a given viewer is allowed to see/act on in a filter,
 * assignment, or transfer dropdown — a lead only their own team's
 * managers, an admin everyone. Mirrors the RLS team-scoping rules (see
 * supabase/migrations/0013_teams.sql, `can_view_user`) at the
 * application level: `profiles` itself stays globally readable by RLS
 * (the directory isn't sensitive), so nothing stops a lead's own query
 * from asking for every manager — this is what actually narrows it down
 * to their team before it ever reaches a <Select>. The real write-side
 * guarantee still comes from RLS (traders_update / tasks_insert /
 * portfolio_transfers_insert all reject an out-of-team target
 * regardless of what a form happened to show). */
export async function getScopedManagers(
  supabase: SupabaseClient,
  viewer: Pick<Profile, "role" | "team_id">,
): Promise<Profile[]> {
  let query = supabase
    .from("profiles")
    .select("id, full_name, telegram, role, is_active, team_id")
    .eq("role", "manager")
    .order("full_name");

  if (viewer.role === "lead") {
    // A lead with no team of their own (shouldn't normally happen, but
    // team_id is nullable) sees no managers rather than everyone —
    // failing closed, not open.
    query = query.eq("team_id", viewer.team_id ?? "00000000-0000-0000-0000-000000000000");
  }

  const { data } = await query;
  return (data ?? []) as Profile[];
}
