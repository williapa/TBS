const positions = {
  actor: { q: 0, r: 0 },
  destination: { q: 0, r: 1 },
  target: { q: 1, r: 0 },
  opponent: { q: 2, r: 0 },
};

const key = ({ q, r }) => `${q},${r}`;

const entity = (id, unitTypeId, ownerTeamId, position, options = {}) => ({
  id,
  unitTypeId,
  ownerTeamId,
  ...(position ? { position } : {}),
  health: { current: options.health ?? 100, maximum: 100 },
  actionBudget: { moved: false, acted: false },
  ...(options.cargo ? { cargo: options.cargo } : {}),
  statuses: [],
});

const waitingState = (entities, money = 2_000) => {
  const cells = Object.fromEntries(Object.values(positions).map((position) => [
    key(position),
    { position, terrainTypeId: "plains" },
  ]));
  for (const candidate of Object.values(entities)) {
    if (candidate.position) cells[key(candidate.position)].occupantEntityId = candidate.id;
  }
  return {
    schemaVersion: 2,
    rulesetVersion: "standard@1",
    contentVersion: "standard@1",
    revision: 0,
    lifecycle: { phase: "waiting" },
    board: { cells },
    entities,
    teams: {
      orange: { id: "orange", money },
      purple: { id: "purple", money },
    },
    objectives: [
      { type: "elimination", teamId: "orange" },
      { type: "elimination", teamId: "purple" },
    ],
    turn: { number: 0 },
  };
};

const withOpponent = (entities) => ({
  ...entities,
  opponent: entity("opponent", "soldier", "orange", positions.opponent),
});

const actionScenarios = () => [
  {
    state: waitingState(withOpponent({ actor: entity("actor", "soldier", "purple", positions.actor) })),
    action: { type: "end-turn" },
  },
  {
    state: waitingState(withOpponent({ actor: entity("actor", "soldier", "purple", positions.actor) })),
    action: { type: "move", actorId: "actor", destination: positions.destination },
  },
  {
    state: waitingState({
      actor: entity("actor", "soldier", "purple", positions.actor),
      defender: entity("defender", "soldier", "orange", positions.target),
    }),
    action: {
      type: "attack",
      actorId: "actor",
      destination: positions.destination,
      defenderId: "defender",
    },
  },
  {
    state: waitingState(withOpponent({
      actor: entity("actor", "bluesMusician", "purple", positions.actor),
      target: entity("target", "soldier", "purple", positions.target),
    })),
    action: {
      type: "boost",
      actorId: "actor",
      destination: positions.destination,
      targetId: "target",
    },
  },
  {
    state: waitingState(withOpponent({
      actor: entity("actor", "doctor", "purple", positions.actor),
      target: entity("target", "soldier", "purple", positions.target, { health: 90 }),
    })),
    action: {
      type: "heal",
      actorId: "actor",
      destination: positions.destination,
      targetId: "target",
    },
  },
  {
    state: waitingState(withOpponent({
      actor: entity("actor", "capital", "purple", positions.actor),
      target: entity("target", "soldier", "purple", positions.target),
    })),
    action: {
      type: "spawn",
      actorId: "actor",
      destination: positions.destination,
      spawnedEntityId: "spawned",
      unitTypeId: "soldier",
    },
  },
  {
    state: waitingState(withOpponent({
      actor: entity("actor", "constructionWorker", "purple", positions.actor),
    })),
    action: {
      type: "construct",
      actorId: "actor",
      destination: positions.destination,
      constructionPosition: positions.target,
      buildingEntityId: "constructed",
      buildingUnitTypeId: "office",
    },
  },
  {
    state: waitingState(withOpponent({
      actor: entity("actor", "soldier", "purple", positions.actor),
      vehicle: entity("vehicle", "truck", "purple", positions.target),
    })),
    action: {
      type: "load",
      actorId: "actor",
      destination: positions.destination,
      vehicleId: "vehicle",
    },
  },
  {
    state: waitingState(withOpponent({
      actor: entity("actor", "truck", "purple", positions.actor, {
        cargo: { capacity: 1, entityIds: ["cargo"] },
      }),
      cargo: entity("cargo", "soldier", "purple"),
    })),
    action: {
      type: "unload",
      actorId: "actor",
      destination: positions.actor,
      unloadPosition: positions.destination,
    },
  },
];

module.exports = { actionScenarios, waitingState };
