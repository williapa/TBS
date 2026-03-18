import { animalUnitOptions, flyingOptions, groundVehicleOptions, moveableOptions, TerrainOptions } from "../types";
// how much energy does a unit type consume to move onto this terrain type?
const getTerrainUnitMovementCost = (unit: string, terrain: string): number => {

  if (moveableOptions.indexOf(unit) < 0) return 1023;

  if (flyingOptions.indexOf(unit) > -1) return 1;

  switch (terrain) {
    case TerrainOptions[0]: // beach 
      return groundVehicleOptions.indexOf(unit) > -1 ? 2 : 1;
    case TerrainOptions[1]: // forest
      return groundVehicleOptions.indexOf(unit) > -1 ? 2 : 1;
    case TerrainOptions[2]: // mountain
      return unit === animalUnitOptions[1] ? 2 : 3;
    case TerrainOptions[3]: // road - everybody likes the road!
      return 1;
    case TerrainOptions[4]: // plains
     return unit === animalUnitOptions[1] ? 0 : 1;
    case TerrainOptions[5]: // desert
      return unit === animalUnitOptions[1] ? 1 : 2;
    case TerrainOptions[6]: // water 
      return unit === "sub" ? 1 : 1023;
    default:
      return 1023;
  }

};

export default getTerrainUnitMovementCost;
