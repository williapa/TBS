import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { SavedMap} from "../../maps";
import { useMapRepository } from "../../maps";
import Map from "../../components/Map/Map";
import MapEditorForm from "./MapEditorForm";
import MapEditor from "./MapEditor";

const defaultFormValues = {
  submitted: false,
};

const MapEditorPage = () => {
  const { mapId } = useParams();
  const repository = useMapRepository();
  const [formValues, setFormValues] = useState(defaultFormValues);
  const [savedMap, setSavedMap] = useState<SavedMap>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!mapId) return;
    repository.get(mapId).then((map) => {
      if (!map || map.readOnly) setError(map?.readOnly ? "Bundled maps are read-only" : "Map not found");
      else setSavedMap(map);
    }).catch((value) => setError(value instanceof Error ? value.message : "Map could not be loaded"));
  }, [mapId, repository]);

  if (mapId) {
    if (error) return <main><p role="alert">{error}</p><Link to="/maps/new">Create a new map</Link></main>;
    if (!savedMap) return <main><p>Loading map…</p></main>;
    return <Map mapId={savedMap.id} name={savedMap.name} initialMap={savedMap.map} mode="editor" />;
  }

  switch(formValues.submitted) {
    case false:
      return <MapEditorForm submit={setFormValues} />;
    default:
      return <MapEditor config={formValues} />
  }
}

export default MapEditorPage;
