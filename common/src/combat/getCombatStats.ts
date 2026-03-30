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
    bluesMusician: [10, 30],
    constructionWorker: [15, 5],
    doctor: [5, 1],
    engineer: [3, 1],
    leader: [50, 35],
    michaelJackson: [86,86], // todo: rename to "Pop star"
    pilot: [15,5],
    priest: [1,1],
    scientist: [1,1],
    soldier: [30,15],
    studentAthlete: [10,10], 
    worker: [10,2],
    zookeeper: [4,4],
    zuckerbird: [8,8]
  };

  if (isKeyOfObject(unit, unitMap)) {
    return unitMap[unit];
  } 

  return [0,0];

};

export default getCombatStats;
