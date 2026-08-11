import { ContractValidationError } from "@TBS/common";
import { GatewayError } from "../GameSessionGateway";

type ErrorLike = { code?: unknown; message?: unknown; retryable?: unknown };

const gatewayCodes: GatewayError["code"][] = [
  "auth-unavailable", "game-not-found", "invalid-invite", "not-a-member",
  "spectator-read-only", "spectator-limit", "wrong-team", "stale-revision", "duplicate-action",
  "incompatible-data", "invalid-action", "network", "unknown",
];

const errorLike = (value: unknown): ErrorLike =>
  typeof value === "object" && value !== null ? value as ErrorLike : {};

export const normalizeSupabaseGatewayError = (value: unknown): GatewayError => {
  if (value instanceof ContractValidationError) {
    return { code: "incompatible-data", message: value.message, retryable: false };
  }
  const error = errorLike(value);
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "Supabase request failed";
  const lower = message.toLowerCase();

  if (gatewayCodes.includes(code as GatewayError["code"]) && typeof error.retryable === "boolean") {
    return { code: code as GatewayError["code"], message, retryable: error.retryable };
  }

  if (code === "PT409") return { code: "stale-revision", message, retryable: true };
  if (code === "23505") return { code: "duplicate-action", message, retryable: false };
  if (code === "28000") return { code: "auth-unavailable", message, retryable: true };
  if (code === "P0002") {
    return { code: lower.includes("invite") ? "invalid-invite" : "game-not-found", message, retryable: false };
  }
  if (code === "42501") {
    if (lower.includes("spectator")) return { code: "spectator-read-only", message, retryable: false };
    if (lower.includes("active turn")) return { code: "wrong-team", message, retryable: false };
    return { code: "not-a-member", message, retryable: false };
  }
  if (lower.includes("spectator limit")) return { code: "spectator-limit", message, retryable: false };
  if (code === "22023") {
    return { code: lower.includes("incompatible") ? "incompatible-data" : "invalid-action", message, retryable: false };
  }
  if (lower.includes("fetch") || lower.includes("network") || lower.includes("timeout")) {
    return { code: "network", message, retryable: true };
  }
  return { code: "unknown", message, retryable: false };
};
