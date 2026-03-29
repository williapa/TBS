import { MapItem, buildingUnitOptions} from "../types";

const buildingIncomeMap = {
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

const getUnitIncome = (item: MapItem): number => {
  
  const unitType = item.unit;

  if (buildingUnitOptions.indexOf(unitType) > 0) return 0;

  return buildingIncomeMap[unitType];

};

export default getUnitIncome;
