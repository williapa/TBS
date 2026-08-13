import { createInitialGameSetup } from "@TBS/game-setup";
import {
  Alert,
  Button,
  Container,
  ContentLayout,
  Form,
  FormField,
  Header,
  Input,
  Select,
  SpaceBetween,
} from "@cloudscape-design/components";
import type { FormEvent} from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SavedMap} from "../../maps";
import { useMapRepository } from "../../maps";
import { useGameSession } from "../../multiplayer";
import { saveReconnectDetails } from "./sessionReconnect";

export const SessionHomePage = () => {
  const { createGame, connectionState, error } = useGameSession();
  const navigate = useNavigate();
  const mapRepository = useMapRepository();
  const [maps, setMaps] = useState<SavedMap[]>([]);
  const [mapError, setMapError] = useState<string>();
  const [displayName, setDisplayName] = useState("");
  const [mapId, setMapId] = useState("");
  const [shareUrl, setShareUrl] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [mapsLoading, setMapsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    mapRepository.list().then((available) => {
      if (!active) return;
      setMaps(available);
      setMapId((current) => current || available[0]?.id || "");
    }).catch((value) => {
      if (active) setMapError(value instanceof Error ? value.message : "Maps could not be loaded");
    }).finally(() => {
      if (active) setMapsLoading(false);
    });
    return () => { active = false; };
  }, [mapRepository]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const selected = maps.find((map) => map.id === mapId);
    if (!selected) return;
    try {
      const setup = createInitialGameSetup(selected.map);
      const created = await createGame({
        displayName: displayName.trim(),
        initialPayload: setup.initialPayload,
        winCondition: setup.winCondition,
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

  const selectedMap = maps.find((map) => map.id === mapId);

  return (
    <main className="cloudscape-form-page">
      <ContentLayout
        header={(
          <Header
            variant="h1"
            description="Create a two-player match, then share the invite link with your opponent."
          >
            Start a game
          </Header>
        )}
      >
        <SpaceBetween direction="vertical" size="l">
          <form onSubmit={submit}>
            <Form
              actions={(
                <Button
                  variant="primary"
                  formAction="submit"
                  loading={connectionState === "loading"}
                  disabled={!displayName.trim() || !mapId}
                >
                  Create game
                </Button>
              )}
              errorText={error?.message}
            >
              <Container header={<Header variant="h2">Game details</Header>}>
                <SpaceBetween direction="vertical" size="l">
                  <FormField
                    label="Display name"
                    description="This is how your opponent will identify you in the game."
                  >
                    <Input
                      value={displayName}
                      onChange={({ detail }) => setDisplayName(detail.value)}
                      placeholder="Enter your display name"
                      autoFocus
                    />
                  </FormField>
                  <FormField
                    label="Map"
                    description={selectedMap ? `Selected battlefield: ${selectedMap.name}.` : "Choose the battlefield for this match."}
                    errorText={mapError}
                    secondaryControl={(
                      <Button variant="link" formAction="none" onClick={() => navigate("/maps/new")}>Create a new map</Button>
                    )}
                  >
                    <Select
                      ariaLabel="Map"
                      selectedOption={selectedMap ? { label: selectedMap.name, value: selectedMap.id } : null}
                      onChange={({ detail }) => setMapId(detail.selectedOption.value ?? "")}
                      options={maps.map((map) => ({
                        label: map.name,
                        value: map.id,
                        description: map.readOnly ? "Bundled map" : "Custom map",
                      }))}
                      placeholder="Choose a map"
                      loadingText="Loading maps"
                      statusType={mapsLoading ? "loading" : "finished"}
                      empty="No maps are available. Create a map to continue."
                    />
                  </FormField>
                </SpaceBetween>
              </Container>
            </Form>
          </form>
          {shareUrl && (
            <Container header={<Header variant="h2">Invite another player</Header>}>
              <SpaceBetween direction="vertical" size="m">
                <Alert type="success">Your game is ready. Send this link to your opponent.</Alert>
                <FormField label="Share link">
                  <Input readOnly value={shareUrl} onChange={() => undefined} />
                </FormField>
                <SpaceBetween direction="horizontal" size="xs">
                  <Button iconName="copy" formAction="none" onClick={copy}>{copied ? "Copied" : "Copy link"}</Button>
                  <Button variant="primary" formAction="none" onClick={() => navigate(new URL(shareUrl).pathname)}>Open game</Button>
                </SpaceBetween>
              </SpaceBetween>
            </Container>
          )}
        </SpaceBetween>
      </ContentLayout>
    </main>
  );
};
