"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./env";

export function createSupabaseBrowserClient() {
  const { key, url } = getSupabasePublicConfig();
  return createBrowserClient(url, key);
}
