import { Coords, MapItem } from "../types"
import moveMapUnit from "./moveMapUnit";
import calculateDamage from "./calculateDamage";

const isUnitDead = (dmg: number, unit: MapItem) => {
  return (unit.damage || 0) + dmg >= 100;
};

const killUnit = (unit: MapItem) => {
  unit.damage = undefined;
  unit.unit = "none";
  unit.team = "gray";
  return unit;
};

const attack = (attacker: MapItem, defender: MapItem): [MapItem, number] => {

  const initialDefenderDamage = defender.damage || 0;

  let resultDamage = 0;

  const dmg = calculateDamage(attacker, defender);

  if (!isUnitDead(dmg, defender)) {

    defender.damage = (defender.damage || 0) + dmg;

    resultDamage = dmg;

  } else {

    defender = killUnit(defender);
    
    resultDamage = 100 - initialDefenderDamage;

  }

  return [defender, resultDamage];

};

const attackUnit = (mapData: MapItem[][], attacker: Coords, destination: Coords, defender: Coords) => {


  const defenderMapItem = mapData[defender.x][defender.y];

  const movedMapData = moveMapUnit(mapData, attacker, destination);

  let attackerMapItem = movedMapData[destination.x][destination.y];

  attackerMapItem.moved = true;

  let attackResult;

  const defenderResult = attack(attackerMapItem, defenderMapItem);

  const defenderDelta = defenderResult[0];

  if (defenderDelta.unit !== "none") {

    attackResult = attack(defenderDelta, attackerMapItem);

    attackerMapItem = attackResult[0];

  }

  movedMapData[defender.x][defender.y] = defenderDelta;

  movedMapData[destination.x][destination.y] = attackerMapItem;

  return [movedMapData, [defenderResult[1], attackResult ? attackResult[1] : 0]];

};

export default attackUnit;
