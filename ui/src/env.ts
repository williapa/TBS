export type BrowserEnvironment = Readonly<{
  sessionE2E: boolean;
  supabasePublishableKey?: string;
  supabaseUrl?: string;
}>;

export const browserEnvironment: BrowserEnvironment = {
  sessionE2E: import.meta.env.VITE_SESSION_E2E === "true",
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
};
