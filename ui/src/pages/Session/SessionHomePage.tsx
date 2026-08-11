import { startingMoney } from "@TBS/common";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SavedMap, useMapRepository, validateSaveMapInput } from "../../maps";
import { useGameSession } from "../../multiplayer";
import { saveReconnectDetails } from "./sessionReconnect";

export const SessionHomePage = () => {
  const { createGame, connectionState, error } = useGameSession();
  const mapRepository = useMapRepository();
  const [maps, setMaps] = useState<SavedMap[]>([]);
  const [mapError, setMapError] = useState<string>();
  const [displayName, setDisplayName] = useState("");
  const [mapId, setMapId] = useState("");
  const [shareUrl, setShareUrl] = useState<string>();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    mapRepository.list().then((available) => {
      if (!active) return;
      setMaps(available);
      setMapId((current) => current || available[0]?.id || "");
    }).catch((value) => {
      if (active) setMapError(value instanceof Error ? value.message : "Maps could not be loaded");
    });
    return () => { active = false; };
  }, [mapRepository]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const selected = maps.find((map) => map.id === mapId);
    if (!selected) return;
    try {
      const validated = validateSaveMapInput(selected, selected.schemaVersion);
      const created = await createGame({
        displayName: displayName.trim(),
        initialPayload: { map: validated.map, money: { orange: startingMoney, purple: startingMoney } },
        winCondition: "combat-elimination",
      });
      saveReconnectDetails(created.inviteToken, { displayName: displayName.trim(), intent: "player" });
      setShareUrl(`${window.location.origin}/game/${created.inviteToken}`);
    } catch {
      // The provider exposes the normalized error state to this route.
    }
  };

  const copy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
  };

  return (
    <main aria-labelledby="session-home-title">
      <h1 id="session-home-title">Start a game</h1>
      <form onSubmit={submit}>
        <label>
          Display name
          <input
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>
        <label>
          Map
          <select aria-label="Map" value={mapId} onChange={(event) => setMapId(event.target.value)}>
            {maps.map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}
          </select>
        </label>
        <button type="submit" disabled={connectionState === "loading" || !displayName.trim() || !mapId}>
          {connectionState === "loading" ? "Creating…" : "Create game"}
        </button>
      </form>
      {mapError && <p role="alert">{mapError}</p>}
      {error && <p role="alert">{error.message}</p>}
      {shareUrl && (
        <section aria-label="Share game">
          <h2>Invite another player</h2>
          <label>
            Share link
            <input aria-label="Share link" readOnly value={shareUrl} />
          </label>
          <button type="button" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
          <Link to={new URL(shareUrl).pathname}>Open game</Link>
        </section>
      )}
    </main>
  );
};
