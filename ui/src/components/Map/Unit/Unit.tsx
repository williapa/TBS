import type { CSSProperties } from "react";
import { getEmojiForUnit } from "@TBS/renderer-2d";
import type { UnitTypes } from "../../../types";

type UnitProps = {
  boosted?: boolean;
  type: UnitTypes;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
}

const Unit = ({ boosted = false, type, offsetX = 0, offsetY = -4, scale = 1 }: UnitProps) => {
  const style: CSSProperties = {
    display: "inline-block",
    filter: boosted ? "drop-shadow(rgba(255, 255, 255, 1) 0px 0px 12px)" : undefined,
    position: "relative",
    transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
    transformOrigin: "center",
  };

  return (
  <span role="img" 
    style={style}
  >
    {getEmojiForUnit(type)}
  </span>
  );
};
export default Unit;
   
