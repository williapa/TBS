interface CellProps extends RowCol {
  actor?: Actor;
  callback?: any;
  damage?: number;
  editing?: boolean;
  hilightTargets?: (targets: number[]) => void;
  isActive: boolean;
  isTarget?: string | false;
  index: number;
  setActor?: (args: any) => void;
  setEdit?: (args: any) => void;
  mode: ModeType;
  moved?: boolean;
  neighbors?: number[];
  team?: TeamType;
  terrain: TerrainType;
  unit?: UnitTypes;
  width?: number;
  height?: number;
}

type ModeType = "editor" | "game";

interface Route {
  to: string;
  text: string;
  component: JSX.Element;
}

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
  change?: (x: any) => void;
  initial?: any;
  name: string;
  options?: SelectTypes | OptionGroups;
  type: InputType;
  url?: string;
}

type FormProps = {
  className?: string;
  inputs: FieldProps[];
  initialValues?: Record<string, unknown>;
  name?: string;
  top?: string;
  left?: string;
  save: (object: any) => void;
  cancel: () => void;
}

interface InputProps {
  change?: (x: any) => void;
  initial?: any;
  name: string;
  options?: Option[]
  type: InputType;
  url?: string;
}

enum InputType {
  asyncSelect = "asyncSelect",
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
  damage?: number;
  height: number;
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

interface MapItem {
  damage?: number;
  row: number;
  column: number;
  index: number;
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

type GameProps = {
  activeTurn: string;
  challengerMoney: number;
  mapData: MapItem[][];
  creator: string;
  creatorMoney: number;
  challenger: string;
  map: string;
  name: string;
  open_timestamp: string;
  winCondition?: string;
  winner?: string;
};

type ActiveMapProps = {
  active?: boolean;
  activeTeam: TeamType.purple | TeamType.orange;
  mapData: MapItem[][];
  perspective: TeamType.purple | TeamType.orange;
};

type mapType = {
  mapData: any;
  mapName: string;
}

type dim = {
  width: number;
  height: number;
}

type CellFormProps = {
  attack: (targets: number[]) => void;
  cancel: any;
  initialValues: MapItem;
  top: number;
  left: number; 
  save: any;
  targetType?: string | false;
}

type Coords = {
  x: number;
  y: number;
}

type gameActions = "attack" | "end" |  "move";

type Attack = {
  action: "attack";
  attacker: Coords;
  end: Coords;
  defender: Coords;
};

type End = {
  action: "end"
};

type Move = {
  action: "move";
  start: Coords;
  end: Coords;
};

type GameAction = Attack | End | Move;

type Actor = [string, number[], Coords] | false;

type updateGameParams = {
  email: string;
  pin: string;
  gameAction: GameAction;
};

type Events = {
  Items: any[]
}
