import type { DomainEvent, TeamOption } from "@TBS/common";
import prettyPrint from "../../utils/prettyPrint";

const teamName = (team: TeamOption) => prettyPrint(team);
const unitName = (unit: string) => prettyPrint(unit).toLowerCase();
const coords = ({ x, y }: { x: number; y: number }) => `${x},${y}`;
const sameCoords = (left: { x: number; y: number }, right: { x: number; y: number }) =>
  left.x === right.x && left.y === right.y;
const opponent = (team: TeamOption): TeamOption => team === "orange" ? "purple" : "orange";

const collectedMoney = (event: DomainEvent) =>
  "consumedObject" in event && event.consumedObject === "money" && event.moneyAward
    ? ` They collected $${event.moneyAward}.`
    : "";

export const formatDomainEvent = (event: DomainEvent): string => {
  const actor = teamName(event.actorTeam);

  switch (event.type) {
    case "attack": {
      const defender = teamName(opponent(event.actorTeam));
      let description = `${actor} ${unitName(event.unit)} moved from ${coords(event.start)} to ${coords(event.end)} and attacked ${defender} ${unitName(event.defendingUnit)} at ${coords(event.defender)}, dealing ${event.attackDamage} damage and receiving ${event.defenseDamage} counterattack damage.`;
      if (event.deaths.some((cell) => sameCoords(cell, event.end))) {
        description += ` The ${actor} ${unitName(event.unit)} was destroyed.`;
      }
      if (event.deaths.some((cell) => sameCoords(cell, event.defender))) {
        description += ` The ${defender} ${unitName(event.defendingUnit)} was destroyed.`;
      }
      return description + collectedMoney(event);
    }
    case "move": {
      let description = `${actor} moved their ${unitName(event.unit)} from ${coords(event.start)} to ${coords(event.end)}.`;
      if (event.consumedObject === "missile" || event.consumedObject === "nuke") {
        description += ` They launched a ${unitName(event.consumedObject)}`;
        if (event.objectTarget) description += ` at ${coords(event.objectTarget)}`;
        description += ".";
        if (event.objectPreventedByPriest) {
          description += " The defending priest prevented all damage.";
        } else if (event.objectDamage?.length) {
          const destroyed = event.objectDamage.filter((damage) => damage.killed).length;
          description += ` It damaged ${event.objectDamage.length} unit${event.objectDamage.length === 1 ? "" : "s"}`;
          if (destroyed) description += ` and destroyed ${destroyed}`;
          description += ".";
        }
      }
      return description + collectedMoney(event);
    }
    case "boost":
      return `${actor} moved their ${unitName(event.unit)} from ${coords(event.start)} to ${coords(event.end)} and boosted their ${unitName(event.boostedUnit)} at ${coords(event.target)}.${collectedMoney(event)}`;
    case "heal":
      return `${actor} moved their ${unitName(event.unit)} from ${coords(event.start)} to ${coords(event.end)} and healed their ${unitName(event.healedUnit)} at ${coords(event.target)} for ${event.healedDamage} damage.${collectedMoney(event)}`;
    case "construct":
      return `${actor} spent $${event.cost} to construct a ${unitName(event.building)} at ${coords(event.cell)}.${collectedMoney(event)}`;
    case "spawn":
      return `${actor} spent $${event.cost} to spawn a ${unitName(event.unit)} at ${coords(event.end)}.`;
    case "load":
      return `${actor} loaded their ${unitName(event.unit)} into their ${unitName(event.vehicleUnit)} at ${coords(event.vehicle)}.${collectedMoney(event)}`;
    case "unload":
      return `${actor} unloaded their ${unitName(event.unit)} from their ${unitName(event.vehicleUnit)} at ${coords(event.cell)}.${collectedMoney(event)}`;
    case "endTurn":
      return `${actor} ended their turn. ${teamName(event.nextTeam)} gained $${event.income} income.`;
    case "gameOver":
      return `${teamName(event.winner)} won the game!`;
  }
};
