import { animalUnitOptions, flyingOptions, groundVehicleOptions, moveableOptions, peopleUnitOptions } from "../types";

const getDefaultUnitEnergy = (unit: string) => {

  // no energy for non movables
  if (moveableOptions.indexOf(unit) < 0) return 0; 
  
  // flying units
  if (flyingOptions.indexOf(unit) > -1) return 5;

  // soldiers and stsudent athletes can run real fast and far
  if (unit === peopleUnitOptions[9] || unit === peopleUnitOptions[10]) return 2;

  // ground vehicles 
  if (groundVehicleOptions.indexOf(unit) > -1) return 4;

  // lion
  if (unit === animalUnitOptions[1]) return 3;

  // everyone else is 1;
  return 1;

};

export default getDefaultUnitEnergy;
