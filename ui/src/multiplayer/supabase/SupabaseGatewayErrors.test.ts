import { ContractValidationError } from "@TBS/common";
import { normalizeSupabaseGatewayError } from "./SupabaseGatewayErrors";

describe("normalizeSupabaseGatewayError", () => {
  test.each([
    [{ code: "PT409", message: "stale" }, "stale-revision", true],
    [{ code: "42501", message: "spectators cannot submit actions" }, "spectator-read-only", false],
    [{ code: "P0001", message: "spectator limit reached (maximum 20)" }, "spectator-limit", false],
    [{ code: "42501", message: "caller does not own the active turn" }, "wrong-team", false],
    [{ code: "P0002", message: "invalid invite token" }, "invalid-invite", false],
    [{ code: "22023", message: "incompatible stored gameplay data" }, "incompatible-data", false],
    [{ message: "fetch failed" }, "network", true],
  ])("maps %#", (input, code, retryable) => {
    expect(normalizeSupabaseGatewayError(input)).toMatchObject({ code, retryable });
  });

  test("maps runtime parser failures to incompatible data", () => {
    expect(normalizeSupabaseGatewayError(new ContractValidationError("snapshot", "bad")))
      .toMatchObject({ code: "incompatible-data", retryable: false });
  });
});
