import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import type {
  BoardEntityViewModel,
  BoardInteractionAnchor,
  BoardIntent,
  BoardIntentHandler,
  BoardTargetType,
  BoardViewModel,
  MoveEntityCue,
} from "@TBS/presentation";

import { getEmojiForAsset } from "../assets/emojiManifest";
import { HEX_SIZE, hexPolygonPoints, projectHexTo2D } from "./projection";

type Renderer2DBoardCommonProps = Readonly<{
  ariaLabel?: string;
  board: BoardViewModel;
  reducedMotion?: boolean;
  className?: string;
}>;

export type Renderer2DBoardProps = Renderer2DBoardCommonProps & (
  | Readonly<{ interactionMode?: "interactive"; onIntent: BoardIntentHandler }>
  | Readonly<{ interactionMode: "static"; onIntent?: never }>
);

const terrainColors: Readonly<Record<string, string>> = {
  "terrain:beach": "#f4d35e",
  "terrain:desert": "#fff3a3",
  "terrain:forest": "#5cab68",
  "terrain:mountain": "#3d4652",
  "terrain:plains": "#9acd32",
  "terrain:road": "#82605c",
  "terrain:water": "#3273dc",
};

const targetColors: Readonly<Record<BoardTargetType, string>> = {
  attack: "#ff5d5d",
  boost: "#58d68d",
  construct: "#f5b041",
  heal: "#5dade2",
  load: "#af7ac5",
  move: "#ffffff",
  spawn: "#f4d03f",
  unload: "#48c9b0",
};

const teamColors: Readonly<Record<string, string>> = {
  orange: "#ff8c00",
  purple: "#a855f7",
};
const teamColor = (teamId: BoardEntityViewModel["teamId"]): string =>
  teamId ? teamColors[teamId] ?? "#6f7782" : "#6f7782";

const cellHoverDescription = (
  cell: BoardViewModel["cells"][number],
): string => cell.target
  ? `${cell.accessibleDescription}; ${cell.target} target`
  : cell.accessibleDescription;

const dispatchOnKeyboard = (
  intent: BoardIntent,
  onIntent: BoardIntentHandler,
) => (event: KeyboardEvent<SVGGElement>) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  onIntent(intent);
};

const pointerAnchor = (
  event: MouseEvent<SVGGElement>,
): BoardInteractionAnchor => ({
  clientX: event.clientX,
  clientY: event.clientY,
});

const entityMotionStyle = (
  entity: BoardEntityViewModel,
  cue: MoveEntityCue | undefined,
  reducedMotion: boolean,
): CSSProperties => {
  if (!cue || reducedMotion) return {};
  const from = projectHexTo2D(cue.from);
  const to = projectHexTo2D(entity.coordinate);
  return {
    animation: `tbs-renderer-2d-move ${cue.durationMs}ms ease-in-out both`,
    "--tbs-move-x": `${from.x - to.x}px`,
    "--tbs-move-y": `${from.y - to.y}px`,
  } as CSSProperties;
};

const Entity = ({
  cellDescription,
  cue,
  entity,
  onIntent,
  reducedMotion,
}: Readonly<{
  cellDescription: string;
  cue?: MoveEntityCue;
  entity: BoardEntityViewModel;
  onIntent?: BoardIntentHandler;
  reducedMotion: boolean;
}>) => {
  const point = projectHexTo2D(entity.coordinate);
  const intent: BoardIntent = { type: "select-entity", entityId: entity.id };
  const healthWidth = entity.health
    ? 44 * (entity.health.current / entity.health.maximum)
    : null;
  const stopAndSelect = (event: MouseEvent<SVGGElement>) => {
    if (!onIntent) return;
    event.stopPropagation();
    onIntent(intent, pointerAnchor(event));
  };
  const interactionProps = onIntent ? {
    "aria-label": entity.accessibleDescription,
    onClick: stopAndSelect,
    onKeyDown: dispatchOnKeyboard(intent, onIntent),
    role: "button",
    style: { cursor: "pointer", outline: "none" },
    tabIndex: 0,
  } as const : {};
  return (
    <g
      data-entity-id={entity.id}
      transform={`translate(${point.x} ${point.y})`}
      {...interactionProps}
    >
      <title>{cellDescription}</title>
      <g key={cue?.id ?? "canonical"} style={entityMotionStyle(entity, cue, reducedMotion)}>
        <circle
          cx={0}
          cy={0}
          fill="rgba(8, 12, 18, 0.82)"
          r={28}
          stroke={entity.selected ? "#ffffff" : teamColor(entity.teamId)}
          strokeWidth={entity.selected ? 5 : entity.actionable ? 4 : 3}
        />
        <text dominantBaseline="central" fontSize={30} textAnchor="middle" y={-2}>
          {getEmojiForAsset(entity.assetId)}
        </text>
        {entity.statuses.includes("moved") && (
          <text fill="#ffffff" fontSize={15} fontWeight="bold" x={-27} y={-18}>✓</text>
        )}
        {healthWidth !== null && (
          <g data-health-bar>
            <rect fill="#321" height={5} rx={2} width={44} x={-22} y={15} />
            <rect fill={teamColor(entity.teamId)} height={5} rx={2} width={healthWidth} x={-22} y={15} />
            <rect data-health-bar-outline fill="none" height={5} rx={2} stroke="#111" strokeWidth={1} width={44} x={-22} y={15} />
          </g>
        )}
        {entity.cargo[0] && (
          <g data-cargo-badge>
            <circle cx={24} cy={-22} fill="rgba(8, 12, 18, 0.92)" r={11} stroke={teamColor(entity.teamId)} strokeWidth={2} />
            <text data-cargo-icon dominantBaseline="central" fontSize={15} textAnchor="middle" x={24} y={-22}>
              {getEmojiForAsset(entity.cargo[0].assetId)}
            </text>
          </g>
        )}
      </g>
    </g>
  );
};

export const Renderer2DBoard = (props: Renderer2DBoardProps) => {
  const {
    ariaLabel,
    board,
    className,
    reducedMotion = false,
  } = props;
  const onIntent = props.interactionMode === "static" ? undefined : props.onIntent;
  const projected = board.cells.map(({ coordinate }) => projectHexTo2D(coordinate));
  const minimumX = Math.min(...projected.map(({ x }) => x)) - HEX_SIZE - 10;
  const maximumX = Math.max(...projected.map(({ x }) => x)) + HEX_SIZE + 10;
  const minimumY = Math.min(...projected.map(({ y }) => y)) - HEX_SIZE - 10;
  const maximumY = Math.max(...projected.map(({ y }) => y)) + HEX_SIZE + 10;
  const cueByEntity = new Map(
    board.animationCues.map((cue) => [cue.entityId, cue]),
  );
  const cellById = new Map(board.cells.map((cell) => [cell.id, cell]));

  return (
    <svg
      aria-label={ariaLabel ?? `Two-dimensional game board, revision ${board.revision}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role={onIntent ? "grid" : "img"}
      style={{ display: "block", height: "100%", touchAction: onIntent ? "manipulation" : "none", width: "100%" }}
      viewBox={`${minimumX} ${minimumY} ${maximumX - minimumX} ${maximumY - minimumY}`}
    >
      <style>{`@keyframes tbs-renderer-2d-move { from { transform: translate(var(--tbs-move-x), var(--tbs-move-y)); } to { transform: translate(0, 0); } }`}</style>
      {board.cells.map((cell) => {
        const point = projectHexTo2D(cell.coordinate);
        const intent: BoardIntent = { type: "select-cell", cell: cell.coordinate };
        const interactionProps = onIntent ? {
          "aria-label": cell.accessibleDescription,
          onClick: (event: MouseEvent<SVGGElement>) => onIntent(intent, pointerAnchor(event)),
          onKeyDown: dispatchOnKeyboard(intent, onIntent),
          role: "gridcell",
          style: { outline: "none" },
          tabIndex: 0,
        } as const : {};
        return (
          <g
            data-cell-id={cell.id}
            key={cell.id}
            transform={`translate(${point.x} ${point.y})`}
            {...interactionProps}
          >
            <polygon
              fill={terrainColors[cell.terrainAssetId] ?? "#77808d"}
              points={hexPolygonPoints()}
              stroke="rgba(8, 12, 18, 0.72)"
              strokeWidth={2}
            />
            <title>{cellHoverDescription(cell)}</title>
          </g>
        );
      })}
      {board.cells.filter((cell) => cell.selection === "focused" || cell.target).map((cell) => {
        const point = projectHexTo2D(cell.coordinate);
        const focused = cell.selection === "focused";
        const stroke = focused
          ? "#ffffff"
          : cell.target
            ? targetColors[cell.target]
            : undefined;
        return (
          <polygon
            data-cell-highlight={cell.id}
            data-highlight-kind={focused ? "selection" : cell.target}
            fill="none"
            key={cell.id}
            points={hexPolygonPoints()}
            pointerEvents="none"
            stroke={stroke}
            strokeDasharray={focused ? undefined : "7 4"}
            strokeWidth={5}
            transform={`translate(${point.x} ${point.y})`}
          />
        );
      })}
      {board.entities.map((entity) => {
        const cell = cellById.get(entity.cellId);
        return (
          <Entity
            cellDescription={cell
              ? cellHoverDescription(cell)
              : `Cell at (${entity.coordinate.q}, ${entity.coordinate.r})`}
            cue={cueByEntity.get(entity.id)}
            entity={entity}
            key={entity.id}
            onIntent={onIntent}
            reducedMotion={reducedMotion}
          />
        );
      })}
    </svg>
  );
};
