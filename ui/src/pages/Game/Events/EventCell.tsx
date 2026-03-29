import { GameEvent } from "@TBS/common";
import prettyPrint from "../../../utils/prettyPrint";

// unit action actor start end 
const EventCell = ({ event }: { event: GameEvent }) => {
  let res = '';

  switch (event.action) {
    case "attack":
      res = [
        `${event.actor} moved unit ${event.unit} from ${event.start.x}`,
        `${event.start.y} to ${event.end.x}`,
        `${event.end.y} and attacked unit ${event.defendingUnit} at ${event.defender.x}`,
        `${event.defender.y} doing ${event.defenseDamage} damage and receiving ${event.attackDamage}.`
      ].join(",");
      [` The attacking ${event.unit}`, ` The defending ${event.defendingUnit}`].forEach((unit, index) => {
        if (event.deaths[index]) res += ` ${unit} died.`;
      });
      break;
    case "move":
      res = `${event.actor} moved unit ${event.unit} from ${event.start.x},${event.start.y} to ${event.end.x},${event.end.y}.`;
      break;
    case "endTurn":
      res = `${event.actor} ended turn. Next player gained ${event.income} income.`;
      break;
    case "construct":
      res = `${event.actor} spent ${event.cost} to construct a ${prettyPrint(event.building).toLowerCase()}.`;
      break;
    case "load":
      res = `${event.actor} loaded ${prettyPrint(event.unit).toLowerCase()} into ${prettyPrint(event.vehicleUnit).toLowerCase()}.`;
      break;
    case "spawn":
      res = `${event.actor} spent ${event.cost} to spawn a ${prettyPrint(event.unit).toLowerCase()}.`;
      break;
    case "unload":
      res = `${event.actor} unloaded ${prettyPrint(event.unit).toLowerCase()} from ${prettyPrint(event.vehicleUnit).toLowerCase()}.`;
      break;
    case "gameOver":
      res = `${event.actor} won the game! the game is over. `;
      break;
    default: 
      res = "Unsupported event data. this may be an error, or a TODO.";
  }

  return <span>{res}</span>;

};

export default EventCell;
