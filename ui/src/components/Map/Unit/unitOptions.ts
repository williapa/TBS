import {
  animalUnitOptions,
  buildingUnitOptions,
  moveableOptions,
  objectUnitOptions,
  peopleUnitOptions,
  vehicleUnitOptions,
} from "@TBS/common";
import type { OptionGroups } from "../../../types";

export {
  animalUnitOptions,
  buildingUnitOptions,
  moveableOptions,
  objectUnitOptions,
  peopleUnitOptions,
  vehicleUnitOptions,
};

export const unitOptions = [
  ["animals", animalUnitOptions],
  ["buildings", buildingUnitOptions],
  ["objects", objectUnitOptions],
  ["people", peopleUnitOptions],
  ["vehicles", vehicleUnitOptions],
] satisfies OptionGroups;
