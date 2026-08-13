import { unitOptions } from "../../../../components/Map/Unit/unitOptions";
import checkEnumValue from "../../../../utils/checkEnumValue";
import type { TeamType } from "../../../../types";

interface BarProps {
  damage?: number;
  unit: string;
  team?: TeamType;
  height: number;
}

const Bar = ({ damage = 0, unit, height, team = "gray" }: BarProps) => {

  const width = ((100 - damage) / 100) * 100;

  // if it's an object it has no health
  if (checkEnumValue(unit, unitOptions[2][1])) {
    return null;
  }

  return (
    <div 
      style={{
        width: "70%",
        marginLeft: "15%",
        minHeight: `${height * .2}px`,
        backgroundColor: "red",
        border: "1px solid black",
        position: "relative",
      }}
    >
      <div 
        style={{
          maxWidth: `${width}%`,
          width: `${width}%`,
          minHeight: `${height * .2}px`,
          backgroundColor: team === "gray" ? "green": team
        }}
      />
    </div>
  );
  
};

export default Bar;
