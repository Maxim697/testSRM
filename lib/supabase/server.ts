import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isDebugNoAuth, DEBUG_USER_ID } from "@/lib/debug-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createClient() {
  // Debug-only, local-only (see lib/debug-auth.ts): every page's data
  // queries go through this one function, so routing them all to the
  // service-role client here — which bypasses RLS — is enough to make the
  // whole app render real seeded data for a fake user with no real
  // session. auth.getUser() is patched to match, since that's the only
  // other thing callers (getCurrentProfile) ask this client for.
  if (isDebugNoAuth()) {
    const admin = createAdminClient();
    admin.auth.getUser = (async () => ({
      data: { user: { id: DEBUG_USER_ID, email: "debug@local" } },
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shimming just enough of the real GoTrue response shape for getCurrentProfile's needs
    })) as any;
    return admin;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render — middleware refreshes
            // the session on the next request, so this can be ignored.
          }
        },
      },
    },
  );
}
