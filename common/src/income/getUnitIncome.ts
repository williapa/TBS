import { MapItem } from "../types";

const getUnitIncome = (item: MapItem): number => {
  if (item.unit === "capital") return 100;
  return 0;
};

export default getUnitIncome;
