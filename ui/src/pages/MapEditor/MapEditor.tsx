import Map from "../../components/Map/Map";
import type { MapEditorProps } from "../../types";

const MapEditor = ({ config }: MapEditorProps) => (
  <Map 
    {...config}
    mode="editor" 
    submitted={true} 
  />
)
export default MapEditor;
