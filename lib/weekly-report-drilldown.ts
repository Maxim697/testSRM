import { createClient } from "@/lib/supabase/server";
import { buildDrilldownData } from "@/lib/weekly-report-drilldown-core";
import type { DrilldownItem } from "@/components/weekly-report/metric-drilldown-modal";

export async function buildDrilldown(
  authorId: string,
  weekStart: string,
): Promise<Record<string, DrilldownItem[]>> {
  const supabase = await createClient();
  return buildDrilldownData(supabase, authorId, weekStart);
}
