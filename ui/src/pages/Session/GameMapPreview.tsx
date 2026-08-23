import type { GameInvitePreview } from "@TBS/application";
import { presentBoard } from "@TBS/presentation";
import { Renderer2DBoard } from "@TBS/renderer-2d";
import {
  Alert,
  Container,
  Header,
  KeyValuePairs,
  SpaceBetween,
  StatusIndicator,
} from "@cloudscape-design/components";
import { useMemo } from "react";

type GameMapPreviewProps = Readonly<{ title: string }> & (
  | Readonly<{ status: "loading" }>
  | Readonly<{ errorText: string; status: "error" }>
  | Readonly<{
    creatorDisplayName: GameInvitePreview["creatorDisplayName"];
    mapName: GameInvitePreview["mapName"];
    state: GameInvitePreview["state"];
    status: "ready";
  }>
);

export const GameMapPreview = (props: GameMapPreviewProps) => {
  const previewState = props.status === "ready" ? props.state : undefined;
  const board = useMemo(
    () => previewState ? presentBoard({ state: previewState }) : undefined,
    [previewState],
  );

  return (
    <Container header={<Header variant="h2">{props.title}</Header>}>
      {props.status === "loading" && (
        <StatusIndicator type="loading">Loading battlefield preview</StatusIndicator>
      )}
      {props.status === "error" && (
        <div role="alert">
          <Alert type="error">{props.errorText}</Alert>
        </div>
      )}
      {board && (
        <SpaceBetween direction="vertical" size="m">
          <KeyValuePairs
            ariaLabel="Game preview details"
            columns={2}
            items={[
              { label: "Map", value: props.status === "ready" ? props.mapName : "" },
              {
                label: "Created by",
                value: props.status === "ready" ? props.creatorDisplayName : "",
              },
            ]}
          />
          <div className="game-map-preview">
            <Renderer2DBoard
              ariaLabel={props.title}
              board={board}
              interactionMode="static"
              reducedMotion
            />
          </div>
        </SpaceBetween>
      )}
    </Container>
  );
};
