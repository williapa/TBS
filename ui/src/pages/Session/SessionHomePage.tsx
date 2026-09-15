import { createInitialGameSetup, DEFAULT_BATTLEFIELD_ID } from "@TBS/game-setup";
import {
  Alert,
  Box,
  Button,
  Container,
  ContentLayout,
  Form,
  FormField,
  Flashbar,
  Header,
  Input,
  Modal,
  Select,
  SpaceBetween,
  Tooltip,
} from "@cloudscape-design/components";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SavedMap } from "../../maps";
import { useMapRepository } from "../../maps";
import { useGameSession } from "../../multiplayer";
import { useSoloGame } from "../../solo";
import { GameMapPreview } from "./GameMapPreview";
import { saveReconnectDetails } from "./sessionReconnect";

type GameModeTooltip = "multiplayer" | "test";

export const SessionHomePage = ({
  showDefaultBattlefield = false,
}: Readonly<{ showDefaultBattlefield?: boolean }>) => {
  const { createGame, connectionState, error } = useGameSession();
  const { startGame: startSoloGame } = useSoloGame();
  const navigate = useNavigate();
  const mapRepository = useMapRepository();
  const [maps, setMaps] = useState<SavedMap[]>([]);
  const [mapError, setMapError] = useState<string>();
  const [mapDeletedNotice, setMapDeletedNotice] = useState<{ content: string }>();
  const [mapPendingDeletion, setMapPendingDeletion] = useState<SavedMap>();
  const [displayName, setDisplayName] = useState("");
  const [mapId, setMapId] = useState("");
  const [shareUrl, setShareUrl] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [mapsLoading, setMapsLoading] = useState(true);
  const [deletingMapId, setDeletingMapId] = useState<string>();
  const [gameModeTooltip, setGameModeTooltip] = useState<GameModeTooltip>();
  const testModeButton = useRef<HTMLSpanElement>(null);
  const createGameButton = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let active = true;
    mapRepository.list().then((available) => {
      if (!active) return;
      const visibleMaps = showDefaultBattlefield
        ? available
        : available.filter(({ id }) => id !== DEFAULT_BATTLEFIELD_ID);
      setMaps(visibleMaps);
      setMapId((current) => (
        visibleMaps.some(({ id }) => id === current) ? current : visibleMaps[0]?.id ?? ""
      ));
    }).catch((value) => {
      if (active) setMapError(value instanceof Error ? value.message : "Maps could not be loaded");
    }).finally(() => {
      if (active) setMapsLoading(false);
    });
    return () => { active = false; };
  }, [mapRepository, showDefaultBattlefield]);

  useEffect(() => {
    if (!mapDeletedNotice) return;
    const timeout = window.setTimeout(() => setMapDeletedNotice(undefined), 3_000);
    return () => window.clearTimeout(timeout);
  }, [mapDeletedNotice]);

  const selectedMap = maps.find((map) => map.id === mapId);
  const selectedSetup = useMemo(() => {
    if (!selectedMap) return {};
    try {
      return { state: createInitialGameSetup(selectedMap) };
    } catch (value) {
      return {
        error: value instanceof Error ? value.message : "The selected map could not be previewed",
      };
    }
  }, [selectedMap]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedMap || !selectedSetup.state) return;
    try {
      const created = await createGame({
        displayName: displayName.trim(),
        initialState: selectedSetup.state,
        mapName: selectedMap.name,
      });
      saveReconnectDetails(created.inviteToken, { displayName: displayName.trim(), intent: "player" });
      setShareUrl(`${window.location.origin}/game/${created.inviteToken}`);
    } catch {
      // The provider exposes the normalized error state to this route.
    }
  };

  const startTestMode = () => {
    if (!selectedMap || !selectedSetup.state) return;
    startSoloGame({
      initialState: selectedSetup.state,
      mapName: selectedMap.name,
    });
    navigate("/game/solo");
  };

  const copy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
  };

  const deleteMap = async () => {
    if (!mapPendingDeletion || mapPendingDeletion.readOnly) return;
    setDeletingMapId(mapPendingDeletion.id);
    setMapError(undefined);
    try {
      await mapRepository.delete(mapPendingDeletion.id);
      const remainingMaps = maps.filter(({ id }) => id !== mapPendingDeletion.id);
      setMaps(remainingMaps);
      setMapId(remainingMaps[0]?.id ?? "");
      setMapDeletedNotice({ content: `Map "${mapPendingDeletion.name}" has been deleted.` });
    } catch (value) {
      setMapError(value instanceof Error ? value.message : "The map could not be deleted");
    } finally {
      setDeletingMapId(undefined);
      setMapPendingDeletion(undefined);
    }
  };

  const closeDeleteModal = () => {
    if (!deletingMapId) setMapPendingDeletion(undefined);
  };

  return (
    <main className="cloudscape-form-page">
      <ContentLayout
        header={(
          <Header
            variant="h1"
            description="Play both teams locally in test mode, or create a multiplayer match your opponent can join via link."
          >
            Start a game
          </Header>
        )}
      >
        <SpaceBetween direction="vertical" size="l">
          {mapPendingDeletion && (
            <Modal
              visible
              onDismiss={closeDeleteModal}
              closeAriaLabel="Close delete map confirmation"
              header="Delete custom map"
              footer={(
                <Box float="right">
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      formAction="none"
                      disabled={Boolean(deletingMapId)}
                      onClick={closeDeleteModal}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      formAction="none"
                      iconName="remove"
                      loading={Boolean(deletingMapId)}
                      onClick={deleteMap}
                    >
                      Delete map
                    </Button>
                  </SpaceBetween>
                </Box>
              )}
            >
              Are you sure you want to delete &quot;{mapPendingDeletion.name}&quot;? This action cannot be undone.
            </Modal>
          )}
          {mapDeletedNotice && (
            <Flashbar
              items={[{
                type: "success",
                content: mapDeletedNotice.content,
              }]}
            />
          )}
          <form onSubmit={submit}>
            <Form
              actions={(
                <>
                  <SpaceBetween direction="horizontal" size="xs">
                    <span
                      ref={testModeButton}
                      onBlur={() => setGameModeTooltip(undefined)}
                      onFocus={() => setGameModeTooltip("test")}
                      onMouseEnter={() => setGameModeTooltip("test")}
                      onMouseLeave={() => setGameModeTooltip(undefined)}
                    >
                      <Button
                        formAction="none"
                        iconAlign="right"
                        iconName="status-info"
                        disabled={!selectedSetup.state}
                        onClick={startTestMode}
                      >
                        Test mode
                      </Button>
                    </span>
                    <span
                      ref={createGameButton}
                      onBlur={() => setGameModeTooltip(undefined)}
                      onFocus={() => setGameModeTooltip("multiplayer")}
                      onMouseEnter={() => setGameModeTooltip("multiplayer")}
                      onMouseLeave={() => setGameModeTooltip(undefined)}
                    >
                      <Button
                        variant="primary"
                        formAction="submit"
                        iconAlign="right"
                        iconName="status-info"
                        loading={connectionState === "loading"}
                        disabled={!displayName.trim() || !selectedSetup.state}
                      >
                        Create game
                      </Button>
                    </span>
                  </SpaceBetween>
                  {gameModeTooltip === "test" && (
                    <Tooltip
                      content="Start instantly on this device and control both Orange and Purple."
                      getTrack={() => testModeButton.current}
                      onEscape={() => setGameModeTooltip(undefined)}
                      position="top"
                    />
                  )}
                  {gameModeTooltip === "multiplayer" && (
                    <Tooltip
                      content="Start an online multiplayer match - invite your opponent via shareable link."
                      getTrack={() => createGameButton.current}
                      onEscape={() => setGameModeTooltip(undefined)}
                      position="top"
                    />
                  )}
                </>
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
                    errorText={mapError ?? selectedSetup.error}
                    secondaryControl={(
                      <Button
                        variant="link"
                        formAction="none"
                        iconName="remove"
                        ariaHaspopup="dialog"
                        disabled={!selectedMap || selectedMap.readOnly}
                        onClick={() => setMapPendingDeletion(selectedMap)}
                      >
                        Delete map
                      </Button>
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
          {selectedMap && selectedSetup.state && (
            <GameMapPreview
              creatorDisplayName={displayName.trim() || "Enter a display name"}
              mapName={selectedMap.name}
              state={selectedSetup.state}
              status="ready"
              title="Map preview"
            />
          )}
        </SpaceBetween>
      </ContentLayout>
    </main>
  );
};
