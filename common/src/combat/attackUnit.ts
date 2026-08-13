import type { Coords, MapItem } from "../types"
import moveMapUnit from "../movement/moveMapUnit";
import calculateDamage from "./calculateDamage";

export type AttackUnitResult = [
  mapData: MapItem[][],
  damage: [damageToDefender: number, counterattackDamage: number]
];

const isUnitDead = (dmg: number, unit: MapItem) => {
  return (unit.damage || 0) + dmg >= 100;
};

const killUnit = (unit: MapItem) => {
  unit.damage = undefined;
  unit.boosted = undefined;
  unit.entityId = undefined;
  unit.loadedUnit = undefined;
  unit.unit = "none";
  unit.team = "gray";
  return unit;
};

const attack = (attacker: MapItem, defender: MapItem): [MapItem, number] => {

  const initialDefenderDamage = defender.damage || 0;

  const dmg = calculateDamage(attacker, defender);
  const killed = isUnitDead(dmg, defender);

  if (!killed) {

    defender.damage = (defender.damage || 0) + dmg;

  } else {

    defender = killUnit(defender);

  }

  return [defender, killed ? 100 - initialDefenderDamage : dmg];

};

const attackUnit = (mapData: MapItem[][], attacker: Coords, destination: Coords, defender: Coords): AttackUnitResult => {


  const defenderMapItem = mapData[defender.x][defender.y];

  const movedMapData = moveMapUnit(mapData, attacker, destination);

  let attackerMapItem = movedMapData[destination.x][destination.y];

  attackerMapItem.moved = true;

  let attackResult: [MapItem, number] | undefined;

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
