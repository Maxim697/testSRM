import { PageSkeleton } from "@/components/ui/page-skeleton";

/** Automatic Suspense fallback for every route nested under this layout
 * (see Next's file convention — this wraps {children} in app/(dashboard)/
 * layout.tsx). The sidebar/header stay mounted and interactive the whole
 * time; only the content area shows this while the next page's data is
 * still being fetched, then it's replaced by the real page in one shot. */
export default function DashboardLoading() {
  return <PageSkeleton />;
}
