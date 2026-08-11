import { ReactNode, useEffect, useState } from "react";
import {
  GameSessionIdentity,
  GameSessionIdentityContext,
  GameSessionIdentityProvider,
} from "../GameSessionIdentity";
import { getSupabaseAnonymousIdentityProvider } from "./SupabaseAnonymousIdentityProvider";

type IdentityGateState =
  | { status: "loading" }
  | { status: "ready"; identity: GameSessionIdentity }
  | { status: "error"; message: string };

type SupabaseIdentityGateProps = {
  children: ReactNode;
  identityProvider?: GameSessionIdentityProvider;
};

export const SupabaseIdentityGate = ({
  children,
  identityProvider = getSupabaseAnonymousIdentityProvider(),
}: SupabaseIdentityGateProps) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<IdentityGateState>({ status: "loading" });

  useEffect(() => {
    let current = true;
    setState({ status: "loading" });
    identityProvider.getIdentity().then(
      (identity) => current && setState({ status: "ready", identity }),
      (error: unknown) => current && setState({
        status: "error",
        message: error instanceof Error ? error.message : "Anonymous authentication is unavailable.",
      })
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
