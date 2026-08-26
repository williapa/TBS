import type { GatewayError } from "@TBS/application";
import { ProtocolValidationError } from "@TBS/protocol";

type ErrorLike = { code?: unknown; message?: unknown; retryable?: unknown };

const gatewayCodes: readonly GatewayError["code"][] = [
  "auth-unavailable", "game-not-found", "invalid-invite", "not-a-member",
  "spectator-read-only", "spectator-limit", "wrong-team", "stale-revision",
  "duplicate-action", "incompatible-data", "invalid-action", "network", "unknown",
];

const errorLike = (value: unknown): ErrorLike =>
  typeof value === "object" && value !== null ? value : {};

const isGatewayCode = (value: string): value is GatewayError["code"] =>
  gatewayCodes.some((candidate) => candidate === value);

export const parseGatewayError = (value: unknown, path = "error"): GatewayError => {
  const error = errorLike(value);
  if (typeof error.code !== "string" || !isGatewayCode(error.code)) {
    throw new ProtocolValidationError([{
      path: `${path}.code`,
      message: "expected a supported gateway error code",
    }]);
  }
  if (typeof error.message !== "string") {
    throw new ProtocolValidationError([{
      path: `${path}.message`,
      message: "expected a string",
    }]);
  }
  if (typeof error.retryable !== "boolean") {
    throw new ProtocolValidationError([{
      path: `${path}.retryable`,
      message: "expected a boolean",
    }]);
  }
  return { code: error.code, message: error.message, retryable: error.retryable };
};

export const normalizeSupabaseGatewayError = (value: unknown): GatewayError => {
  if (value instanceof ProtocolValidationError) {
    return { code: "incompatible-data", message: value.message, retryable: false };
  }
  const error = errorLike(value);
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "Supabase request failed";
  const lower = message.toLowerCase();

  if (isGatewayCode(code) && typeof error.retryable === "boolean") {
    return { code, message, retryable: error.retryable };
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
