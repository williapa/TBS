import { act, fireEvent, render, screen } from "@testing-library/react";
import { GameSessionIdentityProvider, useGameSessionIdentity } from "../GameSessionIdentity";
import { SupabaseIdentityGate } from "./SupabaseIdentityGate";

const IdentityConsumer = () => {
  const { userId } = useGameSessionIdentity();
  return <div>Identity: {userId}</div>;
};

describe("SupabaseIdentityGate", () => {
  it("shows readiness while loading, then exposes the provider-neutral identity", async () => {
    let resolveIdentity!: (identity: { userId: string }) => void;
    const identityProvider: GameSessionIdentityProvider = {
      getIdentity: jest.fn(() => new Promise((resolve) => { resolveIdentity = resolve; })),
    };

    render(
      <SupabaseIdentityGate identityProvider={identityProvider}>
        <IdentityConsumer />
      </SupabaseIdentityGate>
    );
    expect(screen.getByRole("status")).toHaveTextContent("Preparing multiplayer identity");

    await act(async () => resolveIdentity({ userId: "user-1" }));
    expect(await screen.findByText("Identity: user-1")).toBeInTheDocument();
  });

  it("shows Auth failure and retries", async () => {
    const getIdentity = jest.fn()
      .mockRejectedValueOnce(new Error("Auth is offline"))
      .mockResolvedValueOnce({ userId: "user-2" });

    render(
      <SupabaseIdentityGate identityProvider={{ getIdentity }}>
        <IdentityConsumer />
      </SupabaseIdentityGate>
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Auth is offline");
    fireEvent.click(screen.getByRole("button", { name: "Retry authentication" }));
    expect(await screen.findByText("Identity: user-2")).toBeInTheDocument();
    expect(getIdentity).toHaveBeenCalledTimes(2);
  });
});
