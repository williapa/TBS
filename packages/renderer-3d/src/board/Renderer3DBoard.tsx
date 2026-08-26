import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Group, InstancedMesh, OrthographicCamera } from "three";
import { Object3D } from "three";
import type {
  BoardEntityViewModel,
  BoardInteractionAnchor,
  BoardIntentHandler,
  BoardViewModel,
  MoveEntityCue,
} from "@TBS/presentation";

import { entityWorldPosition } from "../animation/entityMotion.js";
import { getProceduralModel } from "../assets/modelManifest.js";
import { initialCameraState, type CameraIntent, type StrategyCameraState, updateCameraState } from "../camera/cameraState.js";
import { cellHighlightRenderOrder, targetHighlightColor, targetHighlightContrastColor } from "./highlightColor.js";
import { HEX_WORLD_ORIENTATION, projectHexToWorld } from "./projection.js";
import { cellForTerrainInstance, createTerrainBatches, type TerrainBatch } from "./terrainBatches.js";

export type Renderer3DBoardProps = Readonly<{
  board: BoardViewModel;
  onIntent: BoardIntentHandler;
  onViewChange?: () => void;
  reducedMotion?: boolean;
  className?: string;
}>;

const pointerAnchor = (
  event: ThreeEvent<MouseEvent>,
): BoardInteractionAnchor => ({
  clientX: event.nativeEvent.clientX,
  clientY: event.nativeEvent.clientY,
});

const terrainColors: Readonly<Record<string, string>> = {
  "terrain:beach": "#d6bd72",
  "terrain:desert": "#d9c985",
  "terrain:forest": "#40764a",
  "terrain:mountain": "#59616c",
  "terrain:plains": "#739e46",
  "terrain:road": "#735d56",
  "terrain:water": "#245c91",
};
const teamColors: Readonly<Record<string, string>> = {
  orange: "#ff8c00",
  purple: "#a855f7",
};
const teamColor = (teamId: BoardEntityViewModel["teamId"]): string =>
  teamId ? teamColors[teamId] ?? "#8b929c" : "#8b929c";

const StrategyCamera = ({ state }: Readonly<{ state: StrategyCameraState }>) => {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const orthographic = camera as OrthographicCamera;
    const azimuth = (Math.PI / 4) + (state.rotationStep * Math.PI / 3);
    const distance = 12;
    orthographic.position.set(
      state.targetX + (Math.cos(azimuth) * distance),
      11,
      state.targetZ + (Math.sin(azimuth) * distance),
    );
    orthographic.lookAt(state.targetX, 0, state.targetZ);
    orthographic.zoom = Math.max(28, Math.min(size.width, size.height) * 0.075) * state.zoom;
    orthographic.updateProjectionMatrix();
  }, [camera, size.height, size.width, state]);
  return null;
};

const TerrainInstances = ({ batch, onIntent }: Readonly<{ batch: TerrainBatch; onIntent: BoardIntentHandler }>) => {
  const mesh = useRef<InstancedMesh>(null);
  const transform = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    batch.instances.forEach(({ position }, index) => {
      transform.position.set(position.x, -0.12, position.z);
      transform.updateMatrix();
      mesh.current?.setMatrixAt(index, transform.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [batch, transform]);
  const selectCell = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const cell = cellForTerrainInstance(batch, event.instanceId);
    if (cell) onIntent(
      { type: "select-cell", cell: cell.coordinate },
      pointerAnchor(event),
    );
  };
  return (
    <instancedMesh args={[undefined, undefined, batch.instances.length]} onClick={selectCell} ref={mesh}>
      <cylinderGeometry args={[0.96, 0.96, 0.24, 6, 1, false, HEX_WORLD_ORIENTATION.cylinderThetaStart]} />
      <meshStandardMaterial color={terrainColors[batch.assetId] ?? "#727d8a"} roughness={0.84} />
    </instancedMesh>
  );
};

const PrimitiveModel = ({ entity }: Readonly<{ entity: BoardEntityViewModel }>) => {
  const model = getProceduralModel(entity.assetId);
  const color = teamColor(entity.teamId);
  if (model.kind === "building") return (
    <group>
      <mesh castShadow position={[0, 0.48, 0]}><boxGeometry args={[0.72, 0.9, 0.72]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>
      <mesh castShadow position={[0, 1.02, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.56, 0.45, 4]} /><meshStandardMaterial color="#d7dce2" /></mesh>
    </group>
  );
  if (model.kind === "aircraft") return (
    <group position={[0, 0.68, 0]} rotation={[0, entity.orientation * Math.PI / 3, 0]}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.25, 1.05, 4]} /><meshStandardMaterial color={color} metalness={0.15} /></mesh>
      <mesh castShadow scale={[0.95, 0.1, 0.28]}><boxGeometry /><meshStandardMaterial color="#e2e8f0" /></mesh>
    </group>
  );
  if (model.kind === "vehicle") return (
    <group position={[0, 0.36, 0]} rotation={[0, entity.orientation * Math.PI / 3, 0]}>
      <mesh castShadow scale={[0.72, 0.34, 0.46]}><boxGeometry /><meshStandardMaterial color={color} /></mesh>
      <mesh castShadow position={[0.18, 0.28, 0]} scale={[0.3, 0.22, 0.38]}><boxGeometry /><meshStandardMaterial color="#d7dce2" /></mesh>
    </group>
  );
  return (
    <group position={[0, 0.45, 0]}>
      <mesh castShadow><cylinderGeometry args={[0.24, 0.34, 0.72, 8]} /><meshStandardMaterial color={color} /></mesh>
      <mesh castShadow position={[0, 0.48, 0]}><sphereGeometry args={[0.24, 12, 8]} /><meshStandardMaterial color="#d7dce2" /></mesh>
    </group>
  );
};

const Entity = ({ cue, entity, onIntent, reducedMotion }: Readonly<{
  cue?: MoveEntityCue;
  entity: BoardEntityViewModel;
  onIntent: BoardIntentHandler;
  reducedMotion: boolean;
}>) => {
  const group = useRef<Group>(null);
  const animation = useRef<{ cueId?: string; startedAtMs?: number }>({});
  const canonical = projectHexToWorld(entity.coordinate);
  useFrame(({ clock }) => {
    if (!group.current) return;
    if (!cue || reducedMotion) {
      group.current.position.set(canonical.x, canonical.y, canonical.z);
      animation.current = {};
      return;
    }
    if (animation.current.cueId !== cue.id) animation.current = { cueId: cue.id, startedAtMs: clock.elapsedTime * 1000 };
    const elapsed = (clock.elapsedTime * 1000) - (animation.current.startedAtMs ?? 0);
    const position = entityWorldPosition(entity, cue, elapsed, false);
    group.current.position.set(position.x, position.y, position.z);
  });
  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onIntent(
      { type: "select-entity", entityId: entity.id },
      pointerAnchor(event),
    );
  };
  const initial = entityWorldPosition(entity, cue, 0, reducedMotion);
  const healthRatio = entity.health
    ? entity.health.current / entity.health.maximum
    : null;
  return (
    <group name={`entity:${entity.id}`} onClick={select} position={[initial.x, initial.y, initial.z]} ref={group}>
      {(entity.selected || entity.actionable) && (
        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.57, 0.72, 24]} />
          <meshBasicMaterial color={entity.selected ? "#ffffff" : "#ffd166"} depthWrite={false} />
        </mesh>
      )}
      <PrimitiveModel entity={entity} />
      {healthRatio !== null && (
        <group position={[0, 1.18, 0]}>
          <mesh position={[-0.2, 0, 0]} scale={[0.6, 0.08, 0.08]}><boxGeometry /><meshBasicMaterial color="#2a1b1b" /></mesh>
          <mesh position={[-0.2 + (0.3 * healthRatio), 0.012, 0.01]} scale={[0.6 * healthRatio, 0.085, 0.085]}><boxGeometry /><meshBasicMaterial color={teamColor(entity.teamId)} /></mesh>
        </group>
      )}
      {entity.teamId === "purple" && <mesh position={[-0.42, 0.22, 0]}><sphereGeometry args={[0.1, 8, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>}
      {entity.teamId === "purple" && <mesh position={[0.42, 0.22, 0]}><sphereGeometry args={[0.1, 8, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>}
      {entity.teamId === "orange" && <mesh position={[0, 0.22, 0]}><sphereGeometry args={[0.12, 8, 6]} /><meshBasicMaterial color="#151515" /></mesh>}
      {entity.cargo.length > 0 && <mesh position={[0.42, 0.72, 0.35]} rotation={[0, Math.PI / 4, 0]}><boxGeometry args={[0.22, 0.22, 0.22]} /><meshBasicMaterial color="#ffffff" /></mesh>}
    </group>
  );
};

type CellHighlight = Readonly<{
  cell: BoardViewModel["cells"][number];
  color: string;
}>;

const CellHighlightLayer = ({
  highlights,
  kind,
}: Readonly<{
  highlights: readonly CellHighlight[];
  kind: "selection" | "target";
}>) => {
  const isSelection = kind === "selection";
  const contrastHeight = isSelection ? 0.055 : 0.035;
  const colorHeight = isSelection ? 0.065 : 0.045;
  const renderOrder = cellHighlightRenderOrder[kind];
  return (
    <group name={`${kind}-highlights`}>
      {highlights.map(({ cell }) => {
        const position = projectHexToWorld(cell.coordinate);
        return (
          <mesh
            key={cell.id}
            position={[position.x, contrastHeight, position.z]}
            renderOrder={renderOrder.contrast}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.66, 0.95, 6, 1, HEX_WORLD_ORIENTATION.ringThetaStart]} />
            <meshBasicMaterial color={targetHighlightContrastColor} depthWrite={false} />
          </mesh>
        );
      })}
      {highlights.map(({ cell, color }) => {
        const position = projectHexToWorld(cell.coordinate);
        return (
          <mesh
            key={cell.id}
            position={[position.x, colorHeight, position.z]}
            renderOrder={renderOrder.color}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.7, 0.91, 6, 1, HEX_WORLD_ORIENTATION.ringThetaStart]} />
            <meshBasicMaterial color={color} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

const BoardScene = ({ board, camera, onIntent, reducedMotion }: Readonly<{
  board: BoardViewModel;
  camera: StrategyCameraState;
  onIntent: BoardIntentHandler;
  reducedMotion: boolean;
}>) => {
  const batches = useMemo(() => createTerrainBatches(board), [board]);
  const cueByEntity = useMemo(() => new Map(board.animationCues.map((cue) => [cue.entityId, cue])), [board.animationCues]);
  const targetHighlights = board.cells.flatMap((cell): readonly CellHighlight[] => cell.target
    ? [{ cell, color: targetHighlightColor(cell.target) }]
    : []);
  const selectionHighlights = board.cells.flatMap((cell): readonly CellHighlight[] => cell.selection !== "none"
    ? [{ cell, color: "#ffffff" }]
    : []);
  return (
    <>
      <StrategyCamera state={camera} />
      <ambientLight intensity={1.25} />
      <directionalLight castShadow intensity={2.2} position={[5, 12, 7]} />
      <group name="board-root">
        {batches.map((batch) => <TerrainInstances batch={batch} key={batch.assetId} onIntent={onIntent} />)}
        <CellHighlightLayer highlights={targetHighlights} kind="target" />
        <CellHighlightLayer highlights={selectionHighlights} kind="selection" />
        {board.entities.map((entity) => (
          <Entity cue={cueByEntity.get(entity.id)} entity={entity} key={entity.id} onIntent={onIntent} reducedMotion={reducedMotion} />
        ))}
      </group>
    </>
  );
};

const controls: readonly Readonly<{ intent: CameraIntent; label: string; text: string }>[] = [
  { intent: "pan-left", label: "Pan camera left", text: "←" },
  { intent: "pan-up", label: "Pan camera up", text: "↑" },
  { intent: "pan-down", label: "Pan camera down", text: "↓" },
  { intent: "pan-right", label: "Pan camera right", text: "→" },
  { intent: "zoom-in", label: "Zoom camera in", text: "+" },
  { intent: "zoom-out", label: "Zoom camera out", text: "−" },
  { intent: "rotate", label: "Rotate camera clockwise", text: "↻" },
];

export const Renderer3DBoard = ({
  board,
  className,
  onIntent,
  onViewChange,
  reducedMotion = false,
}: Renderer3DBoardProps) => {
  const [camera, setCamera] = useState(() => initialCameraState(board.cameraBounds));
  const applyCameraIntent = (intent: CameraIntent) => {
    onViewChange?.();
    setCamera((state) => updateCameraState(state, intent, board.cameraBounds));
  };
  return (
    <div aria-label={`Three-dimensional game board, revision ${board.revision}`} className={className} role="application" style={{ height: "100%", minHeight: 360, position: "relative", width: "100%" }}>
      <Canvas camera={{ far: 100, near: 0.1, position: [8, 10, 8], zoom: 40 }} dpr={[1, 1.75]} frameloop={board.animationCues.length > 0 && !reducedMotion ? "always" : "demand"} gl={{ antialias: true, powerPreference: "high-performance" }} orthographic shadows>
        <color args={["#111827"]} attach="background" />
        <BoardScene board={board} camera={camera} onIntent={onIntent} reducedMotion={reducedMotion} />
      </Canvas>
      <div aria-label="3D camera controls" role="toolbar" style={{ background: "rgba(12, 18, 28, 0.82)", borderRadius: 8, bottom: 10, display: "flex", gap: 4, padding: 6, position: "absolute", right: 10 }}>
        {controls.map((control) => <button aria-label={control.label} key={control.intent} onClick={() => applyCameraIntent(control.intent)} type="button">{control.text}</button>)}
      </div>
    </div>
  );
};
