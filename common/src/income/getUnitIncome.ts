import type { BuildingUnitOption, MapItem, UnitOption} from "../types";
import { buildingUnitOptions} from "../types";

const buildingIncomeMap: Record<BuildingUnitOption, number> = {
  airport: 100,
  bank: 1000,
  capital: 200,
  church: 0,
  college: 0,
  factory: 200,
  house: 100,
  lab: 300,
  office: 400,
  port: 200,
  zoo: 100
};

const isBuildingUnit = (unitType: UnitOption): unitType is BuildingUnitOption =>
  (buildingUnitOptions as readonly UnitOption[]).includes(unitType);

const getUnitIncome = (item: MapItem): number => {
  
  const unitType = item.unit;

  if (!isBuildingUnit(unitType)) return 0;

  return buildingIncomeMap[unitType];

};

export default getUnitIncome;
