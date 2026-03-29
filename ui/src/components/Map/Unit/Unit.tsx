import type { CSSProperties } from "react";
import units from "./units";

type UnitProps = {
  type: UnitTypes;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
}

const Unit = ({ type, offsetX = 0, offsetY = -4, scale = 1 }: UnitProps) => {
  const style: CSSProperties = {
    display: "inline-block",
    position: "relative",
    transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
    transformOrigin: "center",
  };

  return (
  <span role="img" 
    style={style}
  >
    {units[type].symbol}
  </span>
  );
};
export default Unit;
   
