import type { IdentityPort } from "@TBS/application";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import type { GameSessionIdentity } from "./GameSessionIdentity";
import { GameSessionIdentityContext } from "./GameSessionIdentity";

type IdentityGateState =
  | { status: "loading" }
  | { status: "ready"; identity: GameSessionIdentity }
  | { status: "error"; message: string };

type IdentityGateProps = {
  children: ReactNode;
  identityProvider: IdentityPort;
};

export const IdentityGate = ({
  children,
  identityProvider,
}: IdentityGateProps) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<IdentityGateState>({ status: "loading" });

  useEffect(() => {
    let current = true;
    setState({ status: "loading" });
    identityProvider.getIdentity().then(
      (identity) => current && setState({ status: "ready", identity }),
      (error: unknown) => current && setState({
        status: "error",
        message: error instanceof Error
          ? error.message
          : "Anonymous authentication is unavailable.",
      }),
    );
    return () => { current = false; };
  }, [attempt, identityProvider]);

  if (state.status === "loading") {
    return <div role="status">Preparing multiplayer identity…</div>;
  }
  if (state.status === "error") {
    return (
      <div role="alert">
        <p>{state.message}</p>
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          Retry authentication
        </button>
      </div>
    );
  }
  return (
    <GameSessionIdentityContext.Provider value={state.identity}>
      {children}
    </GameSessionIdentityContext.Provider>
  );
};
