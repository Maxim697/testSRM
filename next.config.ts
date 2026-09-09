import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // Every route in this app is server-rendered per-request (auth +
    // Supabase data), so Next's default (dynamic routes aren't kept in
    // the client-side Router Cache at all — every revisit re-fetches)
    // meant navigating back to a section you'd just left always cost a
    // full round trip again. This keeps an already-visited page's
    // rendered result in the browser's own memory for 30s: navigating
    // away and back within that window is instant, no network request,
    // no Supabase query. It's purely client-side and per-browser-tab —
    // nothing here is shared across users, so it can't leak one
    // person's RLS-scoped data to another.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
