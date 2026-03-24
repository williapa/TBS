import { MapItem } from "../types";
import getCombatStats from "./getCombatStats";

const getVitality = (unit: MapItem) => (100 - (unit.damage || 0)) / 100;

const calculateDamage = (attacker: MapItem, defender: MapItem) => {

  const areYouLucky = Math.random() > .55 ? 1 : 0;

  const attackerVitality = getVitality(attacker);
  const defenderVitality = getVitality(defender);
  
  const attackerStats = getCombatStats(attacker);
  const defenderStats = getCombatStats(defender);

  const attackDamage = Math.floor(attackerStats[0] * attackerVitality) + areYouLucky;

  const defenderDamage = Math.ceil(defenderStats[1] * defenderVitality);

  return attackDamage < defenderDamage ? 0 : attackDamage - defenderDamage;

};

export default calculateDamage;
