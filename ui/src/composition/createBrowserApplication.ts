import {
  createSupabaseBrowserClient,
  SupabaseGameClient,
  SupabaseIdentityAdapter,
} from "@TBS/adapter-supabase";
import type { GameClient, IdentityPort } from "@TBS/application";

import { browserEnvironment } from "../env";

export type BrowserApplication = Readonly<{
  gameClient: GameClient;
  identity: IdentityPort;
}>;

export const createBrowserApplication = (): BrowserApplication => {
  const {
    supabaseUrl: url,
    supabasePublishableKey: publishableKey,
  } = browserEnvironment;
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase browser configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const providerClient = createSupabaseBrowserClient({ url, publishableKey });
  const identity = new SupabaseIdentityAdapter(providerClient.auth);
  return {
    gameClient: new SupabaseGameClient(providerClient, identity),
    identity,
  };
};
