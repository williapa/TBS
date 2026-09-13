export type BrowserEnvironment = Readonly<{
  showKeyboardBoardControls: boolean;
  sessionE2E: boolean;
  supabasePublishableKey?: string;
  supabaseUrl?: string;
}>;

export const browserEnvironment: BrowserEnvironment = {
  showKeyboardBoardControls: import.meta.env.VITE_TEST_KEYBOARD_BOARD_CONTROLS === "true",
  sessionE2E: import.meta.env.VITE_SESSION_E2E === "true",
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
};
