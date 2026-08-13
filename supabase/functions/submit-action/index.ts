import {
  evaluateTrustedAction,
  parseActionEnvelope,
  parseAppliedAction,
  parseGameSnapshot,
} from "./generated/trusted-action-runtime.js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const MAX_REQUEST_BYTES = 65_536;
const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

type UnknownRecord = Readonly<Record<string, unknown>>;
type GatewayErrorCode =
  | "auth-unavailable"
  | "game-not-found"
  | "invalid-invite"
  | "not-a-member"
  | "spectator-read-only"
  | "spectator-limit"
  | "wrong-team"
  | "stale-revision"
  | "duplicate-action"
  | "incompatible-data"
  | "invalid-action"
  | "network"
  | "unknown";
type GameSnapshot = Readonly<{
  gameId: string;
  players: UnknownRecord;
  spectatorCount: number;
  state: Readonly<{
    schemaVersion: number;
    revision: number;
    status: "waiting" | "active" | "finished";
    activeTeam?: "orange" | "purple";
    winner?: "orange" | "purple";
    winCondition?: string;
    map: unknown;
    money: unknown;
  }>;
}>;
type ActionEnvelope = Readonly<{
  protocolVersion: number;
  actionId: string;
  expectedRevision: number;
  action: unknown;
}>;
type PinnedGameVersions = Readonly<{
  protocolVersion: number;
  rulesetVersion: string;
  contentVersion: string;
}>;
type TrustedCommitProposal = Readonly<{
  gameId: string;
  callerId: string;
  actionId: string;
  protocolVersion: number;
  rulesetVersion: string;
  contentVersion: string;
  expectedRevision: number;
  action: unknown;
  events: readonly unknown[];
  gameplayPayload: unknown;
  status: "waiting" | "active" | "finished";
  activeTeam: "orange" | "purple" | null;
  winnerTeam: "orange" | "purple" | null;
  snapshot: GameSnapshot;
}>;

const parseEnvelope = parseActionEnvelope as (value: unknown) => ActionEnvelope;
const parseApplied = parseAppliedAction as (value: unknown) => unknown;
const parseSnapshot = parseGameSnapshot as (value: unknown) => GameSnapshot;
const evaluate = evaluateTrustedAction as (input: Readonly<{
  snapshot: unknown;
  callerId: string;
  versions: PinnedGameVersions;
  envelope: unknown;
}>) => Readonly<
  | { ok: true; proposal: TrustedCommitProposal }
  | { ok: false; error: Readonly<{ code: GatewayErrorCode; message: string; retryable: boolean }> }
>;

const record = (value: unknown, path: string): UnknownRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path}: expected an object`);
  }
  return value;
};

const firstRow = (value: unknown, path: string): UnknownRecord => {
  if (!Array.isArray(value) || value.length !== 1) {
    throw new Error(`${path}: expected exactly one row`);
  }
  return record(value[0], `${path}[0]`);
};

const string = (value: unknown, path: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${path}: expected a non-empty string`);
  }
  return value;
};

const integer = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${path}: expected a non-negative integer`);
  }
  return value;
};

const response = (body: unknown, status = 200): Response => new Response(
  JSON.stringify(body),
  { status, headers: jsonHeaders },
);

const failure = (
  code: GatewayErrorCode,
  message: string,
  retryable: boolean,
  snapshot?: GameSnapshot,
) => response({
  ok: false,
  error: { code, message, retryable },
  ...(snapshot ? { snapshot } : {}),
});

const providerFailure = (value: unknown, snapshot?: GameSnapshot): Response => {
  const error = typeof value === "object" && value !== null
    ? value as Readonly<{ code?: unknown; message?: unknown }>
    : {};
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string"
    ? error.message
    : "Trusted action submission failed";
  const lower = message.toLowerCase();
  if (code === "PT409") return failure("stale-revision", message, true, snapshot);
  if (code === "23505") return failure("duplicate-action", message, false, snapshot);
  if (code === "42501") {
    if (lower.includes("spectator")) return failure("spectator-read-only", message, false, snapshot);
    if (lower.includes("active turn")) return failure("wrong-team", message, false, snapshot);
    return failure("not-a-member", message, false, snapshot);
  }
  if (code === "22023") return failure("invalid-action", message, false, snapshot);
  if (code === "55000") return failure("invalid-action", message, false, snapshot);
  return failure("unknown", "Trusted action submission failed", false, snapshot);
};

const snapshotFromRow = (row: UnknownRecord): GameSnapshot => {
  const payload = record(row.gameplay_payload, "snapshot.gameplayPayload");
  return parseSnapshot({
    gameId: row.game_id,
    players: row.players,
    spectatorCount: row.spectator_count,
    state: {
      ...payload,
      schemaVersion: row.schema_version,
      revision: row.revision,
      status: row.status,
      activeTeam: row.active_team === null ? undefined : row.active_team,
      winner: row.winner_team === null ? undefined : row.winner_team,
      winCondition: row.win_condition,
    },
  });
};

const readCanonicalContext = async (
  client: SupabaseClient,
  gameId: string,
): Promise<Readonly<{ snapshot: GameSnapshot; versions: PinnedGameVersions }>> => {
  const [snapshotResult, versionResult] = await Promise.all([
    client.rpc("get_game_snapshot", { requested_game_id: gameId }),
    client
      .from("game_sessions")
      .select("protocol_version,ruleset_version,content_version")
      .eq("id", gameId)
      .single(),
  ]);
  if (snapshotResult.error) throw snapshotResult.error;
  if (versionResult.error) throw versionResult.error;
  const versionRow = record(versionResult.data, "versions");
  return {
    snapshot: snapshotFromRow(firstRow(snapshotResult.data, "snapshot.rows")),
    versions: {
      protocolVersion: integer(versionRow.protocol_version, "versions.protocolVersion"),
      rulesetVersion: string(versionRow.ruleset_version, "versions.rulesetVersion"),
      contentVersion: string(versionRow.content_version, "versions.contentVersion"),
    },
  };
};

const commit = async (
  client: SupabaseClient,
  proposal: TrustedCommitProposal,
) => client.rpc("commit_game_action", {
  requested_game_id: proposal.gameId,
  requested_caller_id: proposal.callerId,
  submitted_action_id: proposal.actionId,
  submitted_protocol_version: proposal.protocolVersion,
  submitted_ruleset_version: proposal.rulesetVersion,
  submitted_content_version: proposal.contentVersion,
  expected_revision: proposal.expectedRevision,
  submitted_action: proposal.action,
  submitted_events: proposal.events,
  candidate_gameplay_payload: proposal.gameplayPayload,
  proposed_status: proposal.status,
  proposed_active_team: proposal.activeTeam,
  proposed_winner_team: proposal.winnerTeam,
});

const retryCommittedAction = async (
  userClient: SupabaseClient,
  serviceClient: SupabaseClient,
  callerId: string,
  versions: PinnedGameVersions,
  snapshot: GameSnapshot,
  envelope: ActionEnvelope,
): Promise<Response | undefined> => {
  const history = await userClient.rpc("get_game_actions", {
    requested_game_id: snapshot.gameId,
    after_revision: envelope.expectedRevision,
    requested_limit: 100,
  });
  if (history.error || !Array.isArray(history.data)) return undefined;
  const prior = history.data
    .map((row, index) => record(row, `history[${index}]`))
    .find((row) => row.action_id === envelope.actionId);
  if (!prior) return undefined;

  const retry = await serviceClient.rpc("commit_game_action", {
    requested_game_id: snapshot.gameId,
    requested_caller_id: callerId,
    submitted_action_id: envelope.actionId,
    submitted_protocol_version: envelope.protocolVersion,
    submitted_ruleset_version: versions.rulesetVersion,
    submitted_content_version: versions.contentVersion,
    expected_revision: envelope.expectedRevision,
    submitted_action: envelope.action,
    submitted_events: prior.events,
    candidate_gameplay_payload: {
      map: snapshot.state.map,
      money: snapshot.state.money,
    },
    proposed_status: snapshot.state.status,
    proposed_active_team: snapshot.state.activeTeam ?? null,
    proposed_winner_team: snapshot.state.winner ?? null,
  });
  if (retry.error) return providerFailure(retry.error, snapshot);
  const row = firstRow(retry.data, "retry.rows");
  return response({
    ok: true,
    appliedAction: parseApplied({
      protocolVersion: row.protocol_version,
      actionId: row.action_id,
      revision: row.committed_action_revision,
      actorTeam: row.actor_team,
      action: row.action,
      events: row.events,
    }),
    snapshot,
  });
};

const environment = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing Edge Function environment: ${name}`);
  return value;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return failure("invalid-action", "Action request exceeds the 65536 byte limit", false);
  }

  try {
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_REQUEST_BYTES) {
      return failure("invalid-action", "Action request exceeds the 65536 byte limit", false);
    }
    const body = record(JSON.parse(bodyText), "request");
    const unexpected = Object.keys(body).find((key) => key !== "gameId" && key !== "envelope");
    if (unexpected) {
      return failure(
        "invalid-action",
        `request.${unexpected}: trusted submission accepts intent fields only`,
        false,
      );
    }
    const gameId = string(body.gameId, "request.gameId");
    const authorization = request.headers.get("Authorization");
    if (!authorization) return failure("auth-unavailable", "Authentication required", true);

    const url = environment("SUPABASE_URL");
    const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
      ?? environment("SUPABASE_ANON_KEY");
    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const identity = await userClient.auth.getUser();
    if (identity.error || !identity.data.user) {
      return failure("auth-unavailable", "Authentication required", true);
    }

    const canonical = await readCanonicalContext(userClient, gameId);
    const evaluation = evaluate({
      snapshot: canonical.snapshot,
      callerId: identity.data.user.id,
      versions: canonical.versions,
      envelope: body.envelope,
    });
    const secretKey = Deno.env.get("SUPABASE_SECRET_KEY")
      ?? environment("SUPABASE_SERVICE_ROLE_KEY");
    const serviceClient = createClient(url, secretKey, {
      auth: { persistSession: false },
    });

    if (!evaluation.ok) {
      if (evaluation.error.code === "stale-revision") {
        let parsedEnvelope: ActionEnvelope | undefined;
        try {
          parsedEnvelope = parseEnvelope(body.envelope);
        } catch {
          // Preserve the evaluator's validation result below.
        }
        if (parsedEnvelope) {
          const retry = await retryCommittedAction(
            userClient,
            serviceClient,
            identity.data.user.id,
            canonical.versions,
            canonical.snapshot,
            parsedEnvelope,
          );
          if (retry) return retry;
        }
      }
      return response({
        ok: false,
        error: evaluation.error,
        snapshot: canonical.snapshot,
      });
    }

    const committed = await commit(serviceClient, evaluation.proposal);
    if (committed.error) return providerFailure(committed.error, canonical.snapshot);
    const row = firstRow(committed.data, "commit.rows");
    return response({
      ok: true,
      appliedAction: parseApplied({
        protocolVersion: row.protocol_version,
        actionId: row.action_id,
        revision: row.committed_action_revision,
        actorTeam: row.actor_team,
        action: row.action,
        events: row.events,
      }),
      snapshot: evaluation.proposal.snapshot,
    });
  } catch (error) {
    return providerFailure(error);
  }
});
