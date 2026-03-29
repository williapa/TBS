import { animalUnitOptions, peopleUnitOptions, vehicleUnitOptions } from "../types";

const canUnitAttack = (unit: string) => {
  // people, animals, and vehicles can attack
  return (animalUnitOptions.indexOf(unit) > -1 || peopleUnitOptions.indexOf(unit) > -1 || vehicleUnitOptions.indexOf(unit) > -1);
};

export default canUnitAttack;
