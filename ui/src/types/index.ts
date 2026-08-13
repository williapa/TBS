import type {
  BuildingUnitOption,
  Coords,
  GameAction,
  MapItem,
  SpawnableUnitOption,
  TeamColor,
  TeamOption,
  TerrainOption,
  UnitOption,
  DomainEvent,
  GameState,
} from "@TBS/common";
import type {
  GameActionMenuState,
  GameCellTargetType,
  GameInteractionMode,
  GameInteractionState,
  GameMenuActionId,
  GameMenuOption,
  MenuPosition,
} from "@TBS/presentation";
import type { EditableMapCell } from "@TBS/game-setup";
import type { ReactNode } from "react";

export type {
  BuildingUnitOption,
  Coords,
  MapItem,
  SpawnableUnitOption,
  TeamColor,
  TeamOption,
  TerrainOption,
  UnitOption,
};

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

export type TeamType = TeamColor;
export type TerrainType = TerrainOption;
export type AnimalType = Extract<UnitOption, "dragon" | "lion">;
export type BuildingType = BuildingUnitOption;
export type ObjectType = Extract<UnitOption, "money" | "missile" | "none" | "nuke">;
export type PersonType = Exclude<UnitOption, AnimalType | BuildingType | ObjectType | VehicleType>;
export type VehicleType = Extract<UnitOption, "airplane" | "ambulance" | "bigTruck" | "helicopter" | "sub" | "truck">;
export type UnitTypes = UnitOption;
export type SpawnableUnitType = SpawnableUnitOption;
export type LoadedUnit = NonNullable<MapItem["loadedUnit"]>;
export type HexMap = MapItem[][];

export type RowCol = Readonly<{
  row: number;
  column: number;
}>;

export type ModeType = "editor" | "game";
export type Dimensions = Readonly<{ width: number; height: number }>;
export type GameCellMenu = Readonly<{
  options: readonly GameMenuOption[];
  position: MenuPosition;
  onAction: (action: GameMenuActionId) => void;
}>;

export type GamePanelAction = Readonly<{
  id: string;
  label: string;
  description: string;
}>;

export type GamePanelRow =
  | Readonly<{ actions: readonly GamePanelAction[]; id: string; label: string; type: "actions" }>
  | Readonly<{ color?: TeamType; id: string; label: string; type: "text"; value: string }>;

export type GamePanelOccupant = Readonly<{
  boosted?: boolean;
  damage?: number;
  moved?: boolean;
  team?: TeamType;
  unit: UnitTypes;
}>;

export type GamePanelState = Readonly<{
  coords: Coords;
  focus: "actor" | "cell";
  occupant: GamePanelOccupant | null;
  rows: readonly GamePanelRow[];
  terrain: TerrainType;
  transportRows?: readonly GamePanelRow[];
}>;

export type GameGridInteractionProps = Readonly<{
  interactive: boolean;
  menu: GameActionMenuState | null;
  onCellClick: (mapItem: MapItem, position: MenuPosition) => void;
  onMenuAction: (action: GameMenuActionId) => void;
  targetedCellIndexes: readonly number[];
  targetType: GameCellTargetType | null;
}>;

export type CellProps = RowCol & Readonly<{
  callback?: (row: number, column: number, mapItem: EditableCell) => void;
  boosted?: boolean;
  damage?: number;
  editing?: boolean;
  gameMenu?: GameCellMenu;
  isActive: boolean;
  index: number;
  loadedUnit?: LoadedUnit;
  onGameCellClick?: (mapItem: MapItem, position: MenuPosition) => void;
  setEdit?: (editing: boolean) => void;
  mode: ModeType;
  moved?: boolean;
  neighbors?: number[];
  team?: TeamType;
  terrain: TerrainType;
  targetType?: GameCellTargetType | null;
  unit?: UnitTypes;
  width?: number;
  height?: number;
}>;

export type TerrainProps = RowCol & Readonly<{
  boosted?: boolean;
  damage?: number;
  height: number;
  loadedUnit?: LoadedUnit;
  moved?: boolean;
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
  cancel: () => void;
  initialValues: MapItem;
  top: number;
  left: number;
  save: (mapItem: EditableCell) => void;
}>;

export type ActionFormProps = Readonly<{
  onAction: (action: GameMenuActionId) => void;
  options: readonly GameMenuOption[];
  top: number;
  left: number;
}>;

export type MapEditorConfig = Readonly<{
  defaultTerrain?: TerrainType;
  dimension?: number;
  mode?: ModeType;
  name?: string;
  submitted: boolean;
}>;

export type MapEditorFormProps = Readonly<{
  submit: (config: MapEditorConfig) => void;
}>;

export type MapEditorProps = Readonly<{ config: MapEditorConfig }>;

export type ActiveMapProps = Readonly<{
  active?: boolean;
  events?: readonly DomainEvent[];
  onAction?: (action: GameAction) => void;
  onPanelStateChange?: (state: GamePanelState | null) => void;
  perspective: TeamOption;
  state: GameState;
}>;

export type {
  GameActionMenuState,
  GameCellTargetType,
  GameInteractionMode,
  GameInteractionState,
  GameMenuActionId,
  GameMenuOption,
  MenuPosition,
};
