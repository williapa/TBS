import {
  BuildingUnitOption,
  buildingUnitOptions,
  MapItem,
  vehicleUnitOptions
} from "../types";

type CombatStats = [number, number];

function isKeyOfObject<T extends object>(key: PropertyKey, obj: T): key is keyof T {
  return key in obj;
}

const isBuildingUnit = (unit: string): unit is BuildingUnitOption =>
  (buildingUnitOptions as readonly string[]).includes(unit);

const getCombatStats = (item: MapItem): CombatStats => {

  const unit: string = item.unit;

  if (unit === "office") return [0, 40];

  if (isBuildingUnit(unit)) return [0,60];

  if (vehicleUnitOptions.indexOf(unit) > -1) return [20, 60]; // todo: define unique values in unitMap for vehicles

  // [attack, defense]
  const unitMap: Record<string, CombatStats> = {
    dragon: [90, 40],
    lion: [90, 25],
    bluesMusician: [10, 30], // special: boost people combat stats +10/+10 (1 boost max)
    constructionWorker: [15, 5], // special: construction DONE
    doctor: [5, 1], // special: heal people units (ambulance should too) +10
    engineer: [3, 1], // special: heal buildings +10
    leader: [50, 35],
    michaelJackson: [86,86], // todo: rename to "Pop star"; pop stars are unstoppable!!!
    pilot: [15,5], // special: heal air vehicles +10
    priest: [1,1], // special: stop bombs / missiles DONE
    scientist: [1,1], // special: boost building stats +10 (max boost +10)
    soldier: [30,15],
    studentAthlete: [10,10], // special: bonus against michael jackson, but 0 def against vehicles. 
    worker: [10,2], // special: heal ground vehicles +10
    zookeeper: [4,4], // special: boost animal stats +10/+10
    zuckerbird: [8,8] // special: bonus attack vs capitals, (fb topples governments), defense against dragons (lizard)...might need to rename to "zucklebird" 
  };

  if (isKeyOfObject(unit, unitMap)) {
    return unitMap[unit];
  } 

  return [0,0];

};

export default getCombatStats;
