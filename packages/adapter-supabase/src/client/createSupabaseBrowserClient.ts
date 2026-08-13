import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SupabaseBrowserConfig = Readonly<{
  url: string;
  publishableKey: string;
}>;

let browserClient: SupabaseClient | undefined;

export const createSupabaseBrowserClient = ({
  url,
  publishableKey,
}: SupabaseBrowserConfig): SupabaseClient => {
  if (browserClient) return browserClient;
  if (!url || !publishableKey) {
    throw new Error("Supabase browser configuration requires a URL and publishable key");
  }
  browserClient = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
  return browserClient;
};
