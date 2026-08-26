import { act, fireEvent, render, screen } from "@testing-library/react";

import type { GameSessionIdentityProvider } from "./GameSessionIdentity";
import { useGameSessionIdentity } from "./GameSessionIdentity";
import { IdentityGate } from "./IdentityGate";

const IdentityConsumer = () => {
  const { userId } = useGameSessionIdentity();
  return <div>Identity: {userId}</div>;
};

describe("IdentityGate", () => {
  it("shows readiness while loading, then exposes the provider-neutral identity", async () => {
    let resolveIdentity!: (identity: { userId: string }) => void;
    const identityProvider: GameSessionIdentityProvider = {
      getIdentity: vi.fn(() => new Promise<{ userId: string }>((resolve) => {
        resolveIdentity = resolve;
      })),
    };

    render(
      <IdentityGate identityProvider={identityProvider}>
        <IdentityConsumer />
      </IdentityGate>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Preparing multiplayer identity");

    await act(async () => resolveIdentity({ userId: "user-1" }));
    expect(await screen.findByText("Identity: user-1")).toBeInTheDocument();
  });

  it("shows authentication failure and retries", async () => {
    const getIdentity = vi.fn()
      .mockRejectedValueOnce(new Error("Auth is offline"))
      .mockResolvedValueOnce({ userId: "user-2" });

    render(
      <IdentityGate identityProvider={{ getIdentity }}>
        <IdentityConsumer />
      </IdentityGate>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Auth is offline");
    fireEvent.click(screen.getByRole("button", { name: "Retry authentication" }));
    expect(await screen.findByText("Identity: user-2")).toBeInTheDocument();
    expect(getIdentity).toHaveBeenCalledTimes(2);
  });
});
