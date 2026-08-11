interface CellProps extends RowCol {
  callback?: any;
  boosted?: boolean;
  damage?: number;
  editing?: boolean;
  gameMenu?: GameCellMenu;
  hilightTargets?: (targets: number[]) => void;
  isActive: boolean;
  index: number;
  loadedUnit?: LoadedUnit;
  onGameCellClick?: (mapItem: MapItem, position: MenuPosition) => void;
  setActor?: (args: any) => void;
  setEdit?: (args: any) => void;
  mode: ModeType;
  moved?: boolean;
  neighbors?: number[];
  team?: TeamType;
  terrain: TerrainType;
  targetType?: GameCellTargetType | null;
  unit?: UnitTypes;
  width?: number;
  height?: number;
}

type ModeType = "editor" | "game";

type SelectTypes = typeof MirrorType |
  typeof TerrainType | 
  typeof TeamType | 
  typeof AnimalType |
  typeof BuildingType | 
  typeof ObjectType |
  typeof PersonType | 
  typeof VehicleType |
  string[];

interface FieldProps {
  initial?: any;
  name: string;
  options?: SelectTypes | OptionGroups;
  type: InputType;
}

interface InputProps {
  initial?: any;
  name: string;
  options?: Option[]
  type: InputType;
}

enum InputType {
  check = "check",
  number = "number",
  select = "select",
  text = "text",
}

interface Option {
  group?: string;
  label: string;
  value: any;
}

interface MapEditorFormProps {
  submit: any;
}

interface MapEditorConfig {
  defaultTerrain?: TerrainType;
  mode?: ModeType;
  name?: string;
  width?: number;
  submitted: boolean;
}

interface MapEditorProps {
  config: MapEditorConfig;
}

interface RowCol {
  row: number;
  column: number;
}

enum TeamType {
  gray = "gray",
  orange = "orange",
  purple = "purple",
}

interface TerrainProps extends RowCol {
  boosted?: boolean;
  damage?: number;
  height: number;
  loadedUnit?: LoadedUnit;
  moved?: boolean;
  team?: TeamType;
  type: TerrainType;
  unit?: JSX.Element;
  unitType: UnitTypes;
}

enum TerrainType {
  beach = "beach", // brown
  forest = "forest", // green
  mountain = "mountain", // black
  road = "road", // gray
  plains = "plains", // white
  desert = "desert", // yellow
  water = "water", // blue
}

enum AnimalType {
  dragon = "dragon", // super. built at zoo. fly, kill people, animals, buildings.
  lion = "lion", // built at zoo. fast, kill people. 
}

enum BuildingType {
  airport = "airport", // builds helicopters, airplanes.
  bank = "bank", // money charisma. recruit foreign money.
  capital = "capital", // cannot be built. max 1 per team. generates money. it dies you lose.
  church = "church", // requires 5 people. builds priest.
  college = "college", // builds student athletes, engineers, zookeeper, doctors.
  factory = "factory", // cannot be repaired. builds ground vehicles.
  house = "house", // generates money. builds blues musician, unit capacity. 
  lab = "lab", // requires college. builds scientist.
  office = "office", // generates money. low defense. 
  port = "port", // requires lab. builds sub.
  zoo = "zoo", // builds zookeepers, animals.
}

enum ObjectType {
  money = "money", // it's just money on the ground that workers or leaders can pick up (other types will steal it) (can have team)
  missile = "missile", // built by engineer. one time ranged attack, explosive. counter planes & helicopters & dragons
  none = "none", // nothing is an object now. that's right!
  nuke = "nuke", // built by scientist. (*nuke + plane + pilot can be killed by a missile, very explosive. expensive*)
}

enum PersonType {
  bluesMusician = "bluesMusician", // super. built at house. heal people, person charisma, recruit colleges, student athletes nearby
  constructionWorker = "constructionWorker", // build buildings with an engineer, repair buildings well
  doctor = "doctor", // built at college. heal people, slow.
  engineer = "engineer", // requires college. combine with construction workers to build buildings. repair vehicles.
  michaelJackson = "michaelJackson", // super. built at science lab, requires leader (*leader can die after*) sacrifice blues musician - (*3 + sub + michael = auto win*)
  leader = "leader", // super. max 1 per team. kill people. recruit people. person, beast charisma.
  pilot = "pilot", // require airport. fly helicopters and planes.
  priest = "priest", // super. requires church. heal people, recruit people, kill dragons & lions
  scientist = "scientist", // built at lab. (*you need the lab before the scientist*) 
  soldier = "soldier", // fighting stuff
  studentAthlete = "studentAthlete", // built at college. person charisma, 
  worker = "worker", // pick up money, harvest money, capture buildings, repair buildings
  zookeeper = "zookeeper", // built at college. build zoo, animal charisma, recruit animals.
  zuckerbird = "zuckerbird", // super. built at college. extend engineer, build offices. recruit colleges, engineers (remote). fly missiles. 
}

enum VehicleType {
  airplane = "airplane", // built at airport. fly with pilot. move anything (people, missile, nuke). defense against dragons, helicopters. 
  ambulance = "ambulance", // built at factory. move doctors, hurt soldiers. cannot be attacked
  bigTruck = "bigTruck", // built at factory. carry 4 people or 1 lion + 1 zookeeper. kill people. 
  helicopter = "helicopter", // built at airport. fly with pilot, carry soldier + pilot, attack from the sky
  truck = "truck", // built at factory. carry 2 people.
  sub = "sub" // built at port. (*3 + sub + michael = auto win*)
}

const UnitType = { ...BuildingType, ...ObjectType, ...PersonType, ...AnimalType, ...VehicleType };
type UnitType = typeof UnitType;
type UnitTypes = BuildingType | ObjectType | PersonType | AnimalType | VehicleType;

type LoadedUnit = {
  boosted?: boolean;
  damage?: number;
  moved?: boolean;
  team: TeamType;
  unit: UnitTypes;
};

interface MapItem {
  boosted?: boolean;
  damage?: number;
  row: number;
  column: number;
  index: number;
  loadedUnit?: LoadedUnit;
  moved?: boolean;
  neighbors?: number[];
  terrain: TerrainType;
  unit: UnitTypes;
  team: TeamType;
}

type HexMap = MapItem[][];

enum MirrorType {
  mirrorX = "mirrorX",
  mirrorXFlipY = "mirrorXFlipY",
  off = "off",
}

type OptionGroups = OptionGroup[];
type OptionGroup = [string, SelectTypes];

type ActiveMapProps = {
  active?: boolean;
  availableFunds: number;
  mapData: MapItem[][];
  onAction?: (action: import("@TBS/common").GameAction) => void;
  onPanelStateChange?: (state: GamePanelState | null) => void;
  perspective: TeamType.purple | TeamType.orange;
};

type dim = {
  width: number;
  height: number;
}

type CellFormProps = {
  attack?: (targets: number[]) => void;
  cancel: any;
  initialValues: MapItem;
  top: number;
  left: number;
  save: any;
}

type ActionFormProps = {
  onAction: (action: GameMenuActionId) => void;
  options: GameMenuOption[];
  top: number;
  left: number;
}

type Coords = {
  x: number;
  y: number;
}

type SpawnableUnitType =
  | AnimalType.dragon
  | AnimalType.lion
  | PersonType.bluesMusician
  | PersonType.constructionWorker
  | PersonType.doctor
  | PersonType.engineer
  | PersonType.leader
  | PersonType.michaelJackson
  | PersonType.pilot
  | PersonType.priest
  | PersonType.scientist
  | PersonType.soldier
  | PersonType.studentAthlete
  | PersonType.worker
  | PersonType.zuckerbird
  | VehicleType.airplane
  | VehicleType.ambulance
  | VehicleType.bigTruck
  | VehicleType.helicopter
  | VehicleType.sub
  | VehicleType.truck;

type GameInteractionMode =
  | "idle"
  | "unitSelected"
  | "actionMenu"
  | "targetingAttack"
  | "targetingBoost"
  | "targetingHeal"
  | "targetingMissile"
  | "targetingNuke"
  | "targetingConstruct"
  | "targetingLoad"
  | "targetingSpawn"
  | "targetingUnload";

type GameCellTargetType = "move" | "attack" | "boost" | "construct" | "heal" | "load" | "spawn" | "unload";

type GameMenuActionId =
  | "move"
  | "chooseAttack"
  | "chooseBoost"
  | "chooseConstruct"
  | "chooseHeal"
  | "chooseLoad"
  | "chooseUnload"
  | "confirmAttack"
  | "confirmBoost"
  | "confirmHeal"
  | "confirmMissileLaunch"
  | "confirmNukeLaunch"
  | "confirmConstruct"
  | "confirmLoad"
  | "confirmSpawn"
  | "confirmUnload"
  | "cancel"
  | `construct:${BuildingType}`
  | `spawn:${SpawnableUnitType}`;

type MenuPosition = {
  top: number;
  left: number;
};

type GameMenuOption = {
  disabled?: boolean;
  id: GameMenuActionId;
  label: string;
};

type GameCellMenu = {
  options: GameMenuOption[];
  position: MenuPosition;
  onAction: (action: GameMenuActionId) => void;
};

type GameActionMenuState = {
  cellIndex: number;
  kind: "origin" | "move" | "attack" | "boost" | "construct" | "heal" | "missile" | "nuke" | "load" | "spawn" | "unload" | "constructSelection";
  options: GameMenuOption[];
  position: MenuPosition;
};

type GameInteractionState = {
  availableAttackTargets: number[];
  availableBoostTargets: number[];
  availableConstructTargets: number[];
  availableHealTargets: number[];
  availableLoadTargets: number[];
  availableMoveTargets: number[];
  availableSpawnTargets: number[];
  availableUnloadTargets: number[];
  menu: GameActionMenuState | null;
  mode: GameInteractionMode;
  origin: Coords | null;
  pendingAction: "attack" | "boost" | "construct" | "heal" | "load" | "missile" | "move" | "nuke" | "spawn" | "unload" | null;
  previewDestination: Coords | null;
  selectedAttackTarget: Coords | null;
  selectedBoostTarget: Coords | null;
  selectedConstructBuilding: BuildingType | null;
  selectedConstructTarget: Coords | null;
  selectedHealTarget: Coords | null;
  selectedLoadVehicle: Coords | null;
  selectedSpawnUnit: SpawnableUnitType | null;
  selectedUnit: MapItem | null;
  selectedUnloadTarget: Coords | null;
};

type GamePanelAction = {
  id: string;
  label: string;
  description: string;
};

type GamePanelRow =
  | {
      actions: GamePanelAction[];
      id: string;
      label: string;
      type: "actions";
    }
  | {
      color?: TeamType;
      id: string;
      label: string;
      type: "text";
      value: string;
    };

type GamePanelOccupant = {
  boosted?: boolean;
  damage?: number;
  moved?: boolean;
  team?: TeamType;
  unit: UnitTypes;
};

type GamePanelState = {
  coords: Coords;
  focus: "actor" | "cell";
  occupant: GamePanelOccupant | null;
  rows: GamePanelRow[];
  terrain: TerrainType;
  transportRows?: GamePanelRow[];
};

type GameGridInteractionProps = {
  interactive: boolean;
  menu: GameActionMenuState | null;
  onCellClick: (mapItem: MapItem, position: MenuPosition) => void;
  onMenuAction: (action: GameMenuActionId) => void;
  targetedCellIndexes: number[];
  targetType: GameCellTargetType | null;
};
