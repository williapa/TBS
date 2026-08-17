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

export type Renderer2DBoardProps = Readonly<{
  board: BoardViewModel;
  onIntent: BoardIntentHandler;
  reducedMotion?: boolean;
  className?: string;
}>;

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

const teamColors = { gray: "#6f7782", orange: "#ff8c00", purple: "#a855f7" } as const;

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
  cue,
  entity,
  onIntent,
  reducedMotion,
}: Readonly<{
  cue?: MoveEntityCue;
  entity: BoardEntityViewModel;
  onIntent: BoardIntentHandler;
  reducedMotion: boolean;
}>) => {
  const point = projectHexTo2D(entity.coordinate);
  const intent: BoardIntent = { type: "select-entity", entityId: entity.id };
  const healthWidth = 44 * (entity.health.current / entity.health.maximum);
  const stopAndSelect = (event: MouseEvent<SVGGElement>) => {
    event.stopPropagation();
    onIntent(intent, pointerAnchor(event));
  };
  return (
    <g
      aria-label={entity.accessibleDescription}
      data-entity-id={entity.id}
      onClick={stopAndSelect}
      onKeyDown={dispatchOnKeyboard(intent, onIntent)}
      role="button"
      style={{ outline: "none" }}
      tabIndex={0}
      transform={`translate(${point.x} ${point.y})`}
    >
      <g key={cue?.id ?? "canonical"} style={entityMotionStyle(entity, cue, reducedMotion)}>
        <circle
          cx={0}
          cy={0}
          fill="rgba(8, 12, 18, 0.82)"
          r={28}
          stroke={entity.selected ? "#ffffff" : teamColors[entity.team]}
          strokeWidth={entity.selected ? 5 : entity.actionable ? 4 : 3}
        />
        <text dominantBaseline="central" fontSize={30} textAnchor="middle" y={-2}>
          {getEmojiForAsset(entity.assetId)}
        </text>
        {entity.cargo[0] && (
          <text dominantBaseline="central" fontSize={17} textAnchor="middle" x={18} y={14}>
            {getEmojiForAsset(entity.cargo[0].assetId)}
          </text>
        )}
        {entity.statuses.includes("moved") && (
          <text fill="#ffffff" fontSize={15} fontWeight="bold" x={-27} y={-18}>✓</text>
        )}
        <rect fill="#321" height={5} rx={2} width={44} x={-22} y={15} />
        <rect fill={teamColors[entity.team]} height={5} rx={2} width={healthWidth} x={-22} y={15} />
        <rect data-health-bar-outline fill="none" height={5} rx={2} stroke="#111" strokeWidth={1} width={44} x={-22} y={15} />
        <circle cx={24} cy={-22} fill={teamColors[entity.team]} r={10} stroke="#111" />
        <text fill={entity.team === "orange" ? "#111" : "#fff"} fontSize={11} fontWeight="bold" textAnchor="middle" x={24} y={-18}>
          {entity.team === "orange" ? "O" : entity.team === "purple" ? "P" : "–"}
        </text>
      </g>
    </g>
  );
};

export const Renderer2DBoard = ({
  board,
  className,
  onIntent,
  reducedMotion = false,
}: Renderer2DBoardProps) => {
  const projected = board.cells.map(({ coordinate }) => projectHexTo2D(coordinate));
  const minimumX = Math.min(...projected.map(({ x }) => x)) - HEX_SIZE - 10;
  const maximumX = Math.max(...projected.map(({ x }) => x)) + HEX_SIZE + 10;
  const minimumY = Math.min(...projected.map(({ y }) => y)) - HEX_SIZE - 10;
  const maximumY = Math.max(...projected.map(({ y }) => y)) + HEX_SIZE + 10;
  const cueByEntity = new Map(
    board.animationCues.map((cue) => [cue.entityId, cue]),
  );

  return (
    <svg
      aria-label={`Two-dimensional game board, revision ${board.revision}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="grid"
      style={{ display: "block", height: "100%", touchAction: "manipulation", width: "100%" }}
      viewBox={`${minimumX} ${minimumY} ${maximumX - minimumX} ${maximumY - minimumY}`}
    >
      <style>{`@keyframes tbs-renderer-2d-move { from { transform: translate(var(--tbs-move-x), var(--tbs-move-y)); } to { transform: translate(0, 0); } }`}</style>
      {board.cells.map((cell) => {
        const point = projectHexTo2D(cell.coordinate);
        const intent: BoardIntent = { type: "select-cell", cell: cell.coordinate };
        return (
          <g
            aria-label={cell.accessibleDescription}
            data-cell-id={cell.legacyIndex}
            key={cell.id}
            onClick={(event) => onIntent(intent, pointerAnchor(event))}
            onKeyDown={dispatchOnKeyboard(intent, onIntent)}
            role="gridcell"
            style={{ outline: "none" }}
            tabIndex={0}
            transform={`translate(${point.x} ${point.y})`}
          >
            <polygon
              fill={terrainColors[cell.terrainAssetId] ?? "#77808d"}
              points={hexPolygonPoints()}
              stroke="rgba(8, 12, 18, 0.72)"
              strokeWidth={2}
            />
            <title>{cell.target ? `${cell.accessibleDescription}; ${cell.target} target` : cell.accessibleDescription}</title>
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
            data-cell-highlight={cell.legacyIndex}
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
      {board.entities.map((entity) => (
        <Entity
          cue={cueByEntity.get(entity.id)}
          entity={entity}
          key={entity.id}
          onIntent={onIntent}
          reducedMotion={reducedMotion}
        />
      ))}
    </svg>
  );
};
