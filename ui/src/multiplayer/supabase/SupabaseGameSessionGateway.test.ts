import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { runGameSessionGatewayReadContract } from "../GameSessionGateway.readContract";
import { runGameSessionGatewayWriteContract } from "../GameSessionGateway.writeContract";
import { runGameSessionGatewayActionFamiliesContract } from "../GameSessionGateway.actionFamiliesContract";
import { SupabaseAnonymousIdentityProvider } from "./SupabaseAnonymousIdentityProvider";
import { SupabaseGameSessionGateway } from "./SupabaseGameSessionGateway";

const enabled = process.env.RUN_SUPABASE_INTEGRATION === "true";

runGameSessionGatewayReadContract("SupabaseGameSessionGateway", () => {
  const clients: SupabaseClient[] = [];
  return {
    createGateway() {
      const client = createClient(
        process.env.REACT_APP_SUPABASE_URL!,
        process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false, storageKey: `supabase-contract-${clients.length}` } }
      );
      clients.push(client);
      return new SupabaseGameSessionGateway(
        client,
        new SupabaseAnonymousIdentityProvider(client.auth)
      );
    },
    async cleanup() {
      await Promise.all(clients.map(async (client) => {
        await client.removeAllChannels();
        await client.auth.signOut();
      }));
    },
  };
}, enabled);

runGameSessionGatewayWriteContract("SupabaseGameSessionGateway", () => {
  const clients: SupabaseClient[] = [];
  return {
    createGateway() {
      const client = createClient(
        process.env.REACT_APP_SUPABASE_URL!,
        process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false, storageKey: `supabase-write-${clients.length}` } }
      );
      clients.push(client);
      return new SupabaseGameSessionGateway(
        client,
        new SupabaseAnonymousIdentityProvider(client.auth)
      );
    },
    async cleanup() {
      await Promise.all(clients.map(async (client) => {
        await client.removeAllChannels();
        await client.auth.signOut();
      }));
    },
  };
}, enabled);

runGameSessionGatewayActionFamiliesContract("SupabaseGameSessionGateway", () => {
  const clients: SupabaseClient[] = [];
  return {
    createGateway() {
      const client = createClient(
        process.env.REACT_APP_SUPABASE_URL!,
        process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false, storageKey: `supabase-actions-${clients.length}` } }
      );
      clients.push(client);
      return new SupabaseGameSessionGateway(client, new SupabaseAnonymousIdentityProvider(client.auth));
    },
    async cleanup() {
      await Promise.all(clients.map(async (client) => {
        await client.removeAllChannels();
        await client.auth.signOut();
      }));
    },
  };
}, enabled);
