import type { FormEvent} from "react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { JoinIntent } from "@TBS/application";
import { useGameSession } from "../../multiplayer/GameSessionProvider";
import { SessionGamePage } from "./SessionGamePage";
import { loadReconnectDetails, saveReconnectDetails } from "./sessionReconnect";

export const InviteJoinPage = () => {
  const { inviteToken = "" } = useParams();
  const { connectionState, error, joinGame, role, session } = useGameSession();
  const [displayName, setDisplayName] = useState("");
  const [requestedIntent, setRequestedIntent] = useState<JoinIntent>();
  const reconnectAttempted = useRef(false);

  useEffect(() => {
    if (reconnectAttempted.current || session || !inviteToken) return;
    reconnectAttempted.current = true;
    const saved = loadReconnectDetails(inviteToken);
    if (!saved) return;
    setDisplayName(saved.displayName);
    setRequestedIntent(saved.intent);
    void joinGame(inviteToken, saved.intent, saved.displayName).catch(() => undefined);
  }, [inviteToken, joinGame, session]);

  const join = (intent: JoinIntent) => async (event: FormEvent) => {
    event.preventDefault();
    setRequestedIntent(intent);
    try {
      await joinGame(inviteToken, intent, displayName.trim());
      saveReconnectDetails(inviteToken, { displayName: displayName.trim(), intent });
    } catch {
      // The provider exposes the normalized error state to this route.
    }
  };

  if (session) {
    const fellBackToSpectator = requestedIntent === "player" && role === "spectator";
    return (
      <>
        {fellBackToSpectator && <p>Player seats are occupied. You joined as a spectator.</p>}
        <SessionGamePage />
      </>
    );
  }

  if (connectionState === "loading" && reconnectAttempted.current) {
    return <p role="status">Reconnecting to game…</p>;
  }

  return (
    <main aria-labelledby="join-title">
      <h1 id="join-title">Join game</h1>
      <form>
        <label>
          Display name
          <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        <button type="submit" disabled={!displayName.trim() || connectionState === "loading"} onClick={join("player")}>
          Join as player
        </button>
        <button type="submit" disabled={!displayName.trim() || connectionState === "loading"} onClick={join("spectator")}>
          Watch as spectator
        </button>
      </form>
      {error && <p role="alert">{error.code === "invalid-invite" ? "This invite link is invalid." : error.message}</p>}
    </main>
  );
};
