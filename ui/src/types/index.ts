import type {
  SessionRole,
  StandardAppliedAction,
  StandardGameSnapshot,
} from "@TBS/application";
import type {
  EditableMapCell,
  MapCell,
  MapGrid,
  MapLoadedUnit,
  MapTeamId,
  MapUnitTypeId,
  MapReflectionAxis,
} from "@TBS/game-setup";
import type {
  BoardCellViewModel,
  BoardIntentHandler,
  BoardViewModel,
  GameActionMenuState,
  GameInteractionMode,
  GameInteractionState,
  GameMenuActionId,
  GameMenuOption,
  MenuPosition,
  StandardActionDraft,
  UnitPanelActionViewModel,
} from "@TBS/presentation";
import type { CameraIntent } from "@TBS/renderer-3d";
import type { ReactNode } from "react";

export type MapItem = MapCell;
export type LoadedUnit = MapLoadedUnit;
export type HexMap = MapGrid;
export type Coords = BoardCellViewModel["coordinate"];
export type TeamType = MapTeamId;
export type TerrainType = MapCell["terrain"];
export type UnitTypes = MapUnitTypeId;

export const inputTypes = {
  check: "check",
  number: "number",
  select: "select",
  text: "text",
} as const;
export type InputType = (typeof inputTypes)[keyof typeof inputTypes];

export const mirrorTypes = {
  mirrorX: "mirrorX",
  mirrorXFlipY: "mirrorXFlipY",
  off: "off",
} as const;
export type MirrorType = (typeof mirrorTypes)[keyof typeof mirrorTypes];

export type RowCol = Readonly<{
  row: number;
  column: number;
}>;

export type ModeType = "editor" | "game";
export type Dimensions = Readonly<{ width: number; height: number }>;
export type MapCellEditState = "editable" | "axis" | "disabled";

export type GamePanelAction = UnitPanelActionViewModel;

export type GamePanelTerrain = Readonly<{
  color: string;
  id: string;
  label: string;
}>;

export type GamePanelRow =
  | Readonly<{ actions: readonly GamePanelAction[]; id: string; label: string; type: "actions" }>
  | Readonly<{ color?: string; id: string; label: string; type: "text"; value: string }>
  | Readonly<{ id: string; label: string; terrain: GamePanelTerrain; type: "terrain" }>
  | Readonly<{
      costs: readonly Readonly<{ cost: number; terrain: GamePanelTerrain }>[];
      id: string;
      label: string;
      type: "terrain-costs";
    }>;

export type GamePanelState = Readonly<{
  coords: Coords;
  focus: "actor" | "cell";
  rows: readonly GamePanelRow[];
  transportRows?: readonly GamePanelRow[];
}>;

export type GameMapControlsState = Readonly<{
  board: BoardViewModel;
  onBoardIntent: BoardIntentHandler;
  onCameraIntent: (intent: CameraIntent) => void;
  onRendererChange: (renderer: "2d" | "3d") => void;
  renderer: "2d" | "3d";
  rendererAvailable: boolean;
}>;

export type CellProps = RowCol & Readonly<{
  callback?: (row: number, column: number, mapItem: EditableCell) => void;
  editing?: boolean;
  editState?: MapCellEditState;
  index: number;
  setEdit?: (editing: boolean) => void;
  team?: TeamType;
  terrain: TerrainType;
  unit?: UnitTypes;
  width?: number;
  height?: number;
}>;

export type TerrainProps = RowCol & Readonly<{
  height: number;
  team?: TeamType;
  type: TerrainType;
  unit?: ReactNode;
  unitType: UnitTypes;
}>;

export type SelectValues = Readonly<Record<string, string>> | readonly string[];
export type OptionGroup = readonly [string, SelectValues];
export type OptionGroups = readonly OptionGroup[];

export type FieldProps = Readonly<{
  initial?: string | number | boolean;
  name: string;
  options?: SelectValues | OptionGroups;
  type: InputType;
}>;

export type Option = Readonly<{
  group?: string;
  label: string;
  value: string | number;
}>;

export type InputProps = Readonly<{
  initial?: string | number | boolean;
  name: string;
  options?: readonly Option[];
  type: InputType;
}>;

export type EditableCell = EditableMapCell;

export type CellFormProps = Readonly<{
  close: () => void;
  initialValues: MapItem;
  top: number;
  left: number;
  save: (mapItem: EditableCell) => void;
}>;

export type ActionFormProps = Readonly<{
  placement?: "anchored" | "docked";
  onAction: (action: GameMenuActionId) => void;
  options: readonly GameMenuOption[];
  title: string;
  top: number;
  left: number;
}>;

export type MapEditorConfig =
  | Readonly<{ submitted: false }>
  | Readonly<{
      defaultTerrain: TerrainType;
      dimension: number;
      name: string;
      reflectionAxis: MapReflectionAxis;
      submitted: true;
    }>;

export type SubmittedMapEditorConfig = Extract<MapEditorConfig, Readonly<{ submitted: true }>>;

export type MapEditorFormProps = Readonly<{
  submit: (config: SubmittedMapEditorConfig) => void;
}>;

export type MapEditorProps = Readonly<{ config: SubmittedMapEditorConfig }>;

export type ActiveMapProps = Readonly<{
  active?: boolean;
  events?: StandardAppliedAction["events"];
  transitionId?: StandardAppliedAction["actionId"];
  onAction?: (action: StandardActionDraft) => void;
  onPanelStateChange?: (state: GamePanelState | null) => void;
  onControlsStateChange?: (state: GameMapControlsState | null) => void;
  perspective: Exclude<SessionRole, "spectator">;
  state: StandardGameSnapshot["state"];
}>;

export type {
  GameActionMenuState,
  GameInteractionMode,
  GameInteractionState,
  GameMenuActionId,
  GameMenuOption,
  MenuPosition,
};
