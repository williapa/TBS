// unit action actor start end 
const EventCell = ({ event }: { event: any }) => {
  
  const action = event.action || "";

  let res = '';

  switch (action) {
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
      res = `${event.actor} ended turn.`;
      break;
    default: 
      res = "Unsupported event data. this may be an error, or a TODO.";
  }

  return <span>{res}</span>;

};

export default EventCell;
