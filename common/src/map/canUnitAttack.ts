import { animalUnitOptions, peopleUnitOptions } from "../types";

const canUnitAttack = (unit: string) => {
  // soldier, dragon and lion can attack. that's it (for now)
  const soldier = peopleUnitOptions[9] || "soldier";
  return (animalUnitOptions.indexOf(unit) > -1 || unit === soldier);
};

export default canUnitAttack;
