import {
  Alert,
  Button,
  Container,
  ContentLayout,
  Form,
  FormField,
  Header,
  Input,
  SpaceBetween,
} from "@cloudscape-design/components";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { normalizeGatewayError, type GameInvitePreview, type JoinIntent } from "@TBS/application";
import { useGameSession } from "../../multiplayer/GameSessionProvider";
import { GameMapPreview } from "./GameMapPreview";
import { SessionGamePage } from "./SessionGamePage";
import { loadReconnectDetails, saveReconnectDetails } from "./sessionReconnect";

type InvitePreviewState =
  | Readonly<{ status: "idle" | "loading" }>
  | Readonly<{ invalidInvite: boolean; message: string; status: "error" }>
  | Readonly<{ preview: GameInvitePreview; status: "ready" }>;

export const InviteJoinPage = () => {
  const { inviteToken = "" } = useParams();
  const { connectionState, error, getInvitePreview, joinGame, role, session } = useGameSession();
  const [displayName, setDisplayName] = useState("");
  const [invitePreview, setInvitePreview] = useState<InvitePreviewState>({ status: "idle" });
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

  useEffect(() => {
    if (session || !inviteToken || loadReconnectDetails(inviteToken)) return;
    let active = true;
    setInvitePreview({ status: "loading" });
    void getInvitePreview(inviteToken).then(
      (preview) => {
        if (active) setInvitePreview({ preview, status: "ready" });
      },
      (value: unknown) => {
        if (!active) return;
        const previewError = normalizeGatewayError(value);
        setInvitePreview({
          invalidInvite: previewError.code === "invalid-invite",
          message: previewError.code === "invalid-invite"
            ? "This invite link is invalid."
            : "The battlefield preview could not be loaded.",
          status: "error",
        });
      },
    );
    return () => { active = false; };
  }, [getInvitePreview, inviteToken, session]);

  const join = async (intent: JoinIntent) => {
    setRequestedIntent(intent);
    try {
      await joinGame(inviteToken, intent, displayName.trim());
      saveReconnectDetails(inviteToken, { displayName: displayName.trim(), intent });
    } catch {
      // The provider exposes the normalized error state to this route.
    }
  };

  const submitPlayerJoin = (event: FormEvent) => {
    event.preventDefault();
    void join("player");
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

  const isJoining = connectionState === "loading";
  const previewBlocksJoin = invitePreview.status === "loading"
    || (invitePreview.status === "error" && invitePreview.invalidInvite);
  const errorMessage = error?.code === "invalid-invite" ? "This invite link is invalid." : error?.message;

  return (
    <main className="cloudscape-form-page">
      <ContentLayout
        header={(
          <Header
            variant="h1"
            description="Choose how you want to take part in this match."
          >
            Join game
          </Header>
        )}
      >
        <SpaceBetween direction="vertical" size="l">
          <form onSubmit={submitPlayerJoin}>
            <Form
              actions={(
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    formAction="none"
                    loading={isJoining && requestedIntent === "spectator"}
                    disabled={!displayName.trim() || isJoining || previewBlocksJoin}
                    onClick={() => void join("spectator")}
                  >
                    Watch as spectator
                  </Button>
                  <Button
                    variant="primary"
                    formAction="submit"
                    loading={isJoining && requestedIntent === "player"}
                    disabled={!displayName.trim() || isJoining || previewBlocksJoin}
                  >
                    Join as player
                  </Button>
                </SpaceBetween>
              )}
            >
              <Container header={<Header variant="h2">Player details</Header>}>
                <FormField
                  label="Display name"
                  description="This is how other participants will identify you in the game."
                >
                  <Input
                    value={displayName}
                    onChange={({ detail }) => setDisplayName(detail.value)}
                    placeholder="Enter your display name"
                    autoFocus
                    ariaRequired
                    nativeInputAttributes={{ required: true }}
                  />
                </FormField>
              </Container>
            </Form>
          </form>
          {invitePreview.status === "loading" && (
            <GameMapPreview status="loading" title="Battlefield preview" />
          )}
          {invitePreview.status === "ready" && (
            <GameMapPreview
              creatorDisplayName={invitePreview.preview.creatorDisplayName}
              mapName={invitePreview.preview.mapName}
              state={invitePreview.preview.state}
              status="ready"
              title="Battlefield preview"
            />
          )}
          {invitePreview.status === "error" && (
            <GameMapPreview
              errorText={invitePreview.message}
              status="error"
              title="Battlefield preview"
            />
          )}
          {errorMessage && (
            <div role="alert">
              <Alert type="error">{errorMessage}</Alert>
            </div>
          )}
        </SpaceBetween>
      </ContentLayout>
    </main>
  );
};
