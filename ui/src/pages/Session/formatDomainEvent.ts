import type { StandardAppliedAction } from "@TBS/application";

import prettyPrint from "../../utils/prettyPrint";

type StandardEvent = StandardAppliedAction["events"][number];

const name = (value: string): string => prettyPrint(value).toLowerCase();
const teamName = (value: string): string => prettyPrint(value);
const coords = ({ q, r }: Readonly<{ q: number; r: number }>) => `${q},${r}`;
const collectedMoney = (
  event: StandardEvent,
): string => "consumedObjectTypeId" in event
  && event.consumedObjectTypeId === "money"
  && event.moneyAward
  ? ` They collected $${event.moneyAward}.`
  : "";

export const formatDomainEvent = (event: StandardEvent): string => {
  switch (event.type) {
    case "unit-moved": {
      let description = `${teamName(event.actorTeamId)} moved their ${name(event.unitTypeId)} from ${coords(event.start)} to ${coords(event.end)}.`;
      if (event.consumedObjectTypeId === "missile" || event.consumedObjectTypeId === "nuke") {
        description += ` They launched a ${name(event.consumedObjectTypeId)}`;
        if (event.objectTarget) description += ` at ${coords(event.objectTarget)}`;
        description += ".";
        if (event.objectPreventedByPriest) {
          description += " The defending priest prevented all damage.";
        } else if (event.objectDamage?.length) {
          const destroyed = event.objectDamage.filter(({ killed }) => killed).length;
          description += ` It damaged ${event.objectDamage.length} unit${event.objectDamage.length === 1 ? "" : "s"}`;
          if (destroyed > 0) description += ` and destroyed ${destroyed}`;
          description += ".";
        }
      }
      return description + collectedMoney(event);
    }
    case "unit-attacked": {
      let description = `${teamName(event.actorTeamId)} ${name(event.attackerUnitTypeId)} moved from ${coords(event.start)} to ${coords(event.end)} and attacked ${name(event.defenderUnitTypeId)} at ${coords(event.defenderPosition)}, dealing ${event.attackDamage} damage and receiving ${event.counterattackDamage} counterattack damage.`;
      if (event.deaths.includes(event.attackerId)) description += " The attacker was destroyed.";
      if (event.deaths.includes(event.defenderId)) description += " The defender was destroyed.";
      return description + collectedMoney(event);
    }
    case "unit-boosted":
      return `${teamName(event.actorTeamId)} moved a unit from ${coords(event.start)} to ${coords(event.end)} and boosted an allied unit.${collectedMoney(event)}`;
    case "unit-healed":
      return `${teamName(event.actorTeamId)} moved a unit from ${coords(event.start)} to ${coords(event.end)} and healed an allied unit${event.amount ? ` for ${event.amount}` : ""}.${collectedMoney(event)}`;
    case "unit-constructed":
      return `${teamName(event.actorTeamId)} spent $${event.cost} to construct a ${name(event.unitTypeId)} at ${coords(event.position)}.${collectedMoney(event)}`;
    case "unit-spawned":
      return `${teamName(event.actorTeamId)} spent $${event.cost} to spawn a ${name(event.unitTypeId)} at ${coords(event.position)}.`;
    case "unit-loaded":
      return `${teamName(event.actorTeamId)} loaded a unit into a vehicle at ${coords(event.end)}.${collectedMoney(event)}`;
    case "unit-unloaded":
      return `${teamName(event.actorTeamId)} unloaded a unit at ${coords(event.unloadPosition)}.${collectedMoney(event)}`;
    case "turn-ended":
      return `${teamName(event.actorTeamId)} ended their turn. ${teamName(event.nextTeamId)} gained $${event.income} income.`;
    case "game-over":
      return `${teamName(event.winnerTeamId)} won the game!`;
  }
};
