import HexGrid from "../../components/HexGrid/HexGrid";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import type { MapItem } from "../../types";

const PADDING_LEFT = 30;
const HEIGHT_OFFSET = 270;

const ReadOnlyMap = ({ mapData = [[]] }: { mapData: MapItem[][] }) => {
  
  const { width, height } = useWindowDimensions();
  const dimensions = { 
    width: width - 2 * PADDING_LEFT,
    height: height - HEIGHT_OFFSET
  };

  return (
    <div 
      style={{
        paddingTop: `20px`,
        paddingLeft: `${PADDING_LEFT}px`
      }}
    >
      <HexGrid
        dimensions={dimensions}
        mapData={mapData} />
    </div>
  );
};

export default ReadOnlyMap;
