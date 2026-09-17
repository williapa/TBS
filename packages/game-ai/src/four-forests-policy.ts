import {
  getHexNeighbors,
  hexKey,
  teamId,
  type EntityId,
  type EntityState,
  type GameState,
  type HexCoord,
  type TeamId,
} from "@TBS/game-core";
import {
  calculateCombatDamage,
  standardRuleServices,
  type StandardActionCandidate,
  type StandardActionCandidateSet,
} from "@TBS/game-rules";

export const FOUR_FORESTS_POLICY_VERSION = "four-forests-objective-policy@1" as const;
export const FOUR_FORESTS_OBJECTIVE_TOP_K = 5;
export const FOUR_FORESTS_RECENT_POSITION_WINDOW = 64;

const objectiveAttackerTypes = new Set(["michaelJackson", "zuckerbird"]);
const advanceTypes = new Set(["leader", "michaelJackson", "zuckerbird"]);
const dangerTypes = new Set(["soldier", "leader", "michaelJackson"]);
const orangeTeamId = teamId("orange");
const purpleTeamId = teamId("purple");

const otherTeam = (id: TeamId): TeamId => id === purpleTeamId ? orangeTeamId : purpleTeamId;

const distance = (left: HexCoord, right: HexCoord): number => {
  const q = left.q - right.q;
  const r = left.r - right.r;
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
};

const capitalPosition = (state: GameState, teamId: TeamId): HexCoord => {
  const objective = state.objectives.find((candidate) =>
    candidate.type === "capital" && candidate.controllingTeamId === teamId);
  if (!objective || objective.type !== "capital") {
    throw new Error(`capital objective is unavailable for ${teamId}`);
  }
  return objective.position;
};

const teamEntities = (state: GameState, teamId: TeamId): readonly EntityState[] =>
  Object.values(state.entities).filter((entity) => entity.ownerTeamId === teamId && entity.position);

const unitCounts = (entities: readonly EntityState[]): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();
  for (const entity of entities) counts.set(entity.unitTypeId, (counts.get(entity.unitTypeId) ?? 0) + 1);
  return counts;
};

const pathDistance = (
  state: GameState,
  start: HexCoord,
  target: HexCoord,
  actorId?: EntityId,
  stopAdjacentToTarget = false,
): number => {
  const destinations = stopAdjacentToTarget
    ? new Set(getHexNeighbors(target).filter((position) => {
        const cell = state.board.cells[hexKey(position)];
        return cell
          && cell.terrainTypeId !== "water"
          && (!cell.occupantEntityId || cell.occupantEntityId === actorId);
      }).map(hexKey))
    : new Set([hexKey(target)]);
  const pending: Array<Readonly<{ position: HexCoord; distance: number }>> = [{ position: start, distance: 0 }];
  const visited = new Set([hexKey(start)]);
  while (pending.length > 0) {
    const current = pending.shift();
    if (!current) break;
    if (destinations.has(hexKey(current.position))) return current.distance;
    for (const neighbor of getHexNeighbors(current.position)) {
      const key = hexKey(neighbor);
      const cell = state.board.cells[key];
      if (!cell || visited.has(key) || cell.terrainTypeId === "water") continue;
      if (stopAdjacentToTarget && cell.occupantEntityId && cell.occupantEntityId !== actorId) continue;
      visited.add(key);
      pending.push({ position: neighbor, distance: current.distance + 1 });
    }
  }
  if (stopAdjacentToTarget) return pathDistance(state, start, target);
  return 10_000;
};

const constructionScore = (
  state: GameState,
  candidate: Extract<StandardActionCandidate["action"], { type: "construct" }>,
  desiredType: string,
  ownCapital: HexCoord,
  enemyCapital: HexCoord,
): number => {
  if (candidate.buildingUnitTypeId !== desiredType) return -2_000;
  const openNeighbors = getHexNeighbors(candidate.constructionPosition).filter((position) => {
    const cell = state.board.cells[hexKey(position)];
    return cell && !cell.occupantEntityId && cell.terrainTypeId !== "water";
  }).length;
  return 30_000
    + openNeighbors * 40
    - distance(candidate.constructionPosition, ownCapital) * 15
    + distance(candidate.constructionPosition, enemyCapital) * 3;
};

export const scoreFourForestsCandidate = (
  state: GameState,
  actorTeamId: TeamId,
  candidate: StandardActionCandidate,
): number => {
  const opponentTeamId = otherTeam(actorTeamId);
  const ownEntities = teamEntities(state, actorTeamId);
  const counts = unitCounts(ownEntities);
  const ownCapital = capitalPosition(state, actorTeamId);
  const enemyCapital = capitalPosition(state, opponentTeamId);
  const buildoutReady = (counts.get("office") ?? 0) > 0
    && (counts.get("church") ?? 0) > 0
    && (counts.get("michaelJackson") ?? 0) > 0;
  const { action } = candidate;

  if (action.type === "end-turn") return 0;
  if (action.type === "attack") {
    const attacker = state.entities[action.actorId];
    const defender = state.entities[action.defenderId];
    if (!attacker || !defender) return -10_000;
    const damage = calculateCombatDamage(attacker, defender, standardRuleServices);
    if (damage <= 0) return -1_000;
    if (defender.unitTypeId === "capital") return 108_000 + damage * 20;
    if (buildoutReady && advanceTypes.has(attacker.unitTypeId)) {
      const approach = pathDistance(state, action.destination, enemyCapital);
      const score = 5_000 + damage * 10 - approach * 300;
      return score + (damage >= (defender.health?.current ?? Number.POSITIVE_INFINITY) ? 2_000 : 0);
    }
    const unitValue: Readonly<Record<string, number>> = {
      capital: 10_000,
      michaelJackson: 1_500,
      zuckerbird: 1_500,
      leader: 900,
      constructionWorker: 500,
      office: 700,
      church: 500,
      soldier: 150,
    };
    return 8_000 + damage * 20 + (unitValue[defender.unitTypeId] ?? 200)
      + (damage >= (defender.health?.current ?? Number.POSITIVE_INFINITY) ? 5_000 : 0);
  }
  if (action.type === "construct") {
    if ((counts.get("office") ?? 0) === 0) {
      return constructionScore(state, action, "office", ownCapital, enemyCapital);
    }
    if ((counts.get("church") ?? 0) === 0) {
      return constructionScore(state, action, "church", ownCapital, enemyCapital);
    }
    return -2_000;
  }
  if (action.type === "spawn") {
    if ((counts.get("office") ?? 0) === 0 && (counts.get("constructionWorker") ?? 0) === 0) {
      return action.unitTypeId === "constructionWorker" ? 35_000 : -2_000;
    }
    if ((counts.get("church") ?? 0) > 0 && (counts.get("michaelJackson") ?? 0) === 0) {
      return action.unitTypeId === "michaelJackson" ? 29_000 : -2_000;
    }
    return -2_000;
  }
  if (action.type === "move") {
    const entity = state.entities[action.actorId];
    if (!entity) return -10_000;
    if (advanceTypes.has(entity.unitTypeId) && buildoutReady) {
      const approach = pathDistance(
        state,
        action.destination,
        enemyCapital,
        action.actorId,
        true,
      );
      const priority: Readonly<Record<string, number>> = {
        zuckerbird: 900,
        michaelJackson: 800,
        leader: 400,
      };
      const exposure: Readonly<Record<string, number>> = {
        zuckerbird: 200,
        michaelJackson: 50,
        leader: 100,
      };
      const threats = teamEntities(state, opponentTeamId).filter((opponent) =>
        opponent.position
        && dangerTypes.has(opponent.unitTypeId)
        && distance(action.destination, opponent.position) <= (opponent.unitTypeId === "soldier" ? 3 : 2));
      return 5_000 + (priority[entity.unitTypeId] ?? 0) - approach * 300
        - threats.length * (exposure[entity.unitTypeId] ?? 0);
    }
    if (entity.unitTypeId === "soldier") {
      const threatening = teamEntities(state, opponentTeamId).filter((opponent) =>
        opponent.position
        && advanceTypes.has(opponent.unitTypeId)
        && distance(opponent.position, ownCapital) <= 4);
      if (threatening.length > 0 && distance(action.destination, ownCapital) <= 2) {
        const nearest = Math.min(...threatening.map((opponent) =>
          distance(action.destination, opponent.position ?? action.destination)));
        return 1_500 - nearest * 100;
      }
    }
    return -1_000;
  }
  return -2_000;
};

const compareRank = (
  left: Readonly<{ score: number; logit: number; index: number }>,
  right: Readonly<{ score: number; logit: number; index: number }>,
): number => left.score - right.score || left.logit - right.logit || left.index - right.index;

const best = (choices: readonly Readonly<{ score: number; logit: number; index: number }>[]) =>
  choices.reduce((winner, choice) => compareRank(choice, winner) > 0 ? choice : winner);

export type FourForestsPolicyInput = Readonly<{
  state: GameState;
  candidateSet: StandardActionCandidateSet;
  policyLogits: readonly number[];
  recentPositions?: ReadonlyMap<EntityId, ReadonlySet<string>>;
}>;

export const selectFourForestsCandidateIndex = ({
  state,
  candidateSet,
  policyLogits,
  recentPositions = new Map(),
}: FourForestsPolicyInput): number => {
  if (state.lifecycle.phase !== "active" || candidateSet.actorTeamId !== state.lifecycle.activeTeamId) {
    throw new Error("Four Forests policy requires the active team's current candidates");
  }
  if (candidateSet.stateRevision !== state.revision || candidateSet.candidates.length === 0) {
    throw new Error("Four Forests policy candidates are empty or stale");
  }
  if (policyLogits.length !== candidateSet.candidates.length || policyLogits.some((value) => !Number.isFinite(value))) {
    throw new Error("Four Forests policy logits do not match the legal candidates");
  }

  const ranked = policyLogits
    .map((logit, index) => ({ index, logit }))
    .sort((left, right) => right.logit - left.logit)
    .slice(0, FOUR_FORESTS_OBJECTIVE_TOP_K)
    .map(({ index }) => index);
  const openingChoices = candidateSet.candidates.flatMap((candidate, index) => {
    if (candidate.action.type !== "construct" && candidate.action.type !== "spawn") return [];
    const score = scoreFourForestsCandidate(state, candidateSet.actorTeamId, candidate);
    return score >= 20_000 ? [{ score, logit: policyLogits[index] ?? 0, index }] : [];
  });
  if (openingChoices.length > 0) return best(openingChoices).index;

  const hasObjectiveAttacker = teamEntities(state, candidateSet.actorTeamId)
    .some((entity) => objectiveAttackerTypes.has(entity.unitTypeId));
  if (!hasObjectiveAttacker) return ranked[0] ?? 0;
  const objectiveIndices = candidateSet.candidates.flatMap(({ action }, index) => {
    if (action.type !== "attack" && action.type !== "move") return [];
    const actor = state.entities[action.actorId];
    return actor && objectiveAttackerTypes.has(actor.unitTypeId) ? [index] : [];
  });
  const rerankIndices = [...new Set([...ranked, ...objectiveIndices])];
  const objectiveChoices = rerankIndices.flatMap((index) => {
    const candidate = candidateSet.candidates[index];
    if (!candidate || (candidate.action.type !== "attack" && candidate.action.type !== "move")) return [];
    const actor = state.entities[candidate.action.actorId];
    if (!actor || !objectiveAttackerTypes.has(actor.unitTypeId)) return [];
    let score = scoreFourForestsCandidate(state, candidateSet.actorTeamId, candidate);
    if (score <= 0) return [];
    if (
      candidate.action.type === "move"
      && recentPositions.get(candidate.action.actorId)?.has(hexKey(candidate.action.destination))
    ) score -= 10_000;
    return [{ score, logit: policyLogits[index] ?? 0, index }];
  });
  return objectiveChoices.length > 0 ? best(objectiveChoices).index : ranked[0] ?? 0;
};

export class FourForestsPolicy {
  private readonly recentPositions = new Map<EntityId, string[]>();

  select(input: Omit<FourForestsPolicyInput, "recentPositions">): StandardActionCandidate {
    const index = selectFourForestsCandidateIndex({
      ...input,
      recentPositions: new Map([...this.recentPositions].map(([id, positions]) => [id, new Set(positions)])),
    });
    const selected = input.candidateSet.candidates[index];
    if (!selected) throw new Error("Four Forests policy selected a missing candidate");
    const { action } = selected;
    if (action.type === "attack" || action.type === "move") {
      const actor = input.state.entities[action.actorId];
      if (actor?.position) {
        const positions = this.recentPositions.get(actor.id) ?? [];
        positions.push(hexKey(actor.position));
        this.recentPositions.set(actor.id, positions.slice(-FOUR_FORESTS_RECENT_POSITION_WINDOW));
      }
    }
    return selected;
  }
}
