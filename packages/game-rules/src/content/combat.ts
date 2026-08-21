import type { EntityState } from "@TBS/game-core";

import type { StandardRuleServices } from "../actions/types";

export type CombatStats = Readonly<{ attack: number; defense: number }>;

export const getEffectiveCombatStats = (
  entity: EntityState,
  opponent: EntityState,
  services: StandardRuleServices,
): CombatStats | undefined => {
  const definition = services.getUnit(entity.unitTypeId);
  const opponentDefinition = services.getUnit(opponent.unitTypeId);
  if (!definition || !opponentDefinition) return undefined;
  if (entity.unitTypeId === "studentAthlete" && opponent.unitTypeId === "michaelJackson") {
    return { attack: 100, defense: 100 };
  }
  if (entity.unitTypeId === "studentAthlete" && opponentDefinition.category === "vehicle") {
    return { attack: 10, defense: 0 };
  }
  if (entity.unitTypeId === "zuckerbird" && opponent.unitTypeId === "capital") {
    return { attack: 160, defense: 8 };
  }
  if (entity.unitTypeId === "zuckerbird" && opponent.unitTypeId === "dragon") {
    return { attack: 8, defense: 100 };
  }
  const boost = entity.statuses.some(({ type }) => type === "boosted") ? 10 : 0;
  return { attack: definition.base.attack + boost, defense: definition.base.defense + boost };
};

export const calculateCombatDamage = (
  attacker: EntityState,
  defender: EntityState,
  services: StandardRuleServices,
): number => {
  if (!attacker.health || !defender.health) return 0;
  const attackerStats = getEffectiveCombatStats(attacker, defender, services);
  const defenderStats = getEffectiveCombatStats(defender, attacker, services);
  if (!attackerStats || !defenderStats) return 0;
  const attackDamage = Math.floor(attackerStats.attack * (attacker.health.current / attacker.health.maximum));
  const defenseDamage = Math.ceil(defenderStats.defense * (defender.health.current / defender.health.maximum));
  return Math.max(0, attackDamage - defenseDamage);
};
