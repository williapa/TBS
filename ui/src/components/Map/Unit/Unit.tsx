import units from "./units";

type UnitProps = {
  type: UnitTypes;
}

const Unit = ({ type }: UnitProps) => (
  <span role="img" 
    style={{
      position: "relative",
      top: "-4px"
    }} 
  >
    {units[type].symbol}
  </span>
);
export default Unit;
   