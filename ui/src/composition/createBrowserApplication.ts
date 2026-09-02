import { currentStandardProtocolCodec } from "@TBS/application";
import type { GameClient } from "@TBS/application";

import { browserEnvironment } from "../env";
import { createDeferredGameClient } from "./createDeferredGameClient";

export type BrowserApplication = Readonly<{
  gameClient: GameClient;
}>;

const loadMultiplayerClient = async (): Promise<GameClient> => {
  const {
    supabaseUrl: url,
    supabasePublishableKey: publishableKey,
  } = browserEnvironment;
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase browser configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const {
    createSupabaseBrowserClient,
    SupabaseGameClient,
    SupabaseIdentityAdapter,
  } = await import("@TBS/adapter-supabase");
  const providerClient = createSupabaseBrowserClient({ url, publishableKey });
  const identity = new SupabaseIdentityAdapter(providerClient.auth);
  return new SupabaseGameClient(providerClient, currentStandardProtocolCodec, identity);
};

export const createBrowserApplication = (): BrowserApplication => ({
  gameClient: createDeferredGameClient(loadMultiplayerClient),
});
