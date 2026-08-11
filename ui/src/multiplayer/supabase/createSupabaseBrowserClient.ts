import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export const createSupabaseBrowserClient = (): SupabaseClient => {
  if (browserClient) return browserClient;

  const url = process.env.REACT_APP_SUPABASE_URL;
  const publishableKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase browser configuration is missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_PUBLISHABLE_KEY."
    );
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
