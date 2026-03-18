import Map from "../../components/Map/Map";

const MapEditor = ({ config }: MapEditorProps) => (
  <Map 
    {...config}
    mode="editor" 
    submitted={true} 
  />
)
export default MapEditor;