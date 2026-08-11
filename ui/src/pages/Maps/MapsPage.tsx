import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { exportMap, importMap, SavedMap, useMapRepository } from "../../maps";

export const MapsPage = () => {
  const repository = useMapRepository();
  const [maps, setMaps] = useState<SavedMap[]>([]);
  const [error, setError] = useState<string>();
  const load = useCallback(() => repository.list().then(setMaps).catch((value) => {
    setError(value instanceof Error ? value.message : "Maps could not be loaded");
  }), [repository]);

  useEffect(() => { void load(); }, [load]);

  const remove = async (map: SavedMap) => {
    try {
      await repository.delete(map.id);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "The map could not be deleted");
    }
  };

  const download = (map: SavedMap) => {
    try {
      const url = URL.createObjectURL(new Blob([exportMap(map)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${map.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "map"}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (value) {
      setError(value instanceof Error ? value.message : "The map could not be exported");
    }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await repository.save(importMap(await file.text()));
      await load();
      event.target.value = "";
    } catch (value) {
      setError(value instanceof Error ? value.message : "The map could not be imported");
    }
  };

  return (
    <main aria-labelledby="maps-title">
      <h1 id="maps-title">Maps</h1>
      <p><Link to="/maps/new">Create a map</Link></p>
      <label>Import map JSON <input aria-label="Import map JSON" type="file" accept="application/json,.json" onChange={upload} /></label>
      {error && <p role="alert">{error}</p>}
      <ul>
        {maps.map((map) => (
          <li key={map.id}>
            <span>{map.name}{map.readOnly ? " (bundled)" : ""}</span>{" "}
            {!map.readOnly && <Link to={`/maps/${map.id}/edit`}>Edit</Link>}{" "}
            <button type="button" onClick={() => download(map)}>Export {map.name}</button>{" "}
            {!map.readOnly && <button type="button" onClick={() => void remove(map)}>Delete {map.name}</button>}
          </li>
        ))}
      </ul>
    </main>
  );
};
