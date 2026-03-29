import {
  BuildingUnitOption,
  buildingUnitOptions,
  MapItem,
  vehicleUnitOptions
} from "../types";

function isKeyOfObject<T extends object>(key: PropertyKey, obj: T): key is keyof T {
  return key in obj;
}

const isBuildingUnit = (unit: string): unit is BuildingUnitOption =>
  (buildingUnitOptions as readonly string[]).includes(unit);

const getCombatStats = (item: MapItem) => {

  const unit: string = item.unit;

  if (unit === "office") return [0, 40];

  if (isBuildingUnit(unit)) return [0,80];

  if (vehicleUnitOptions.indexOf(unit) > -1) return [20, 60]; // todo: define unique values in unitMap for vehicles

  // [attack, defense]
  const unitMap = {
    dragon: [90, 40],
    lion: [90, 25],
    bluesMusician: [10, 30], // special: increase people combat stats
    constructionWorker: [15, 5], // special: construction
    doctor: [5, 1], // special: heal units (also ambulance should too)
    engineer: [3, 1], // special: heal buildings
    leader: [50, 35],
    michaelJackson: [100,86], 
    pilot: [15,5], // special: heal air vehicles
    priest: [1,1], // special: stop bombs / missiles
    scientist: [1,1], // special: increase building stats
    soldier: [30,15],
    studentAthlete: [10,10], // special: bonus against leader
    worker: [10,2], // special: heal ground vehicles
    zookeeper: [4,4], // special: increase animal stats
    zuckerbird: [8,8] // special: extra damage to capitals
  };

  if (isKeyOfObject(unit, unitMap)) {
    return unitMap[unit];
  } 

  return [0,0];

};

export default getCombatStats;
