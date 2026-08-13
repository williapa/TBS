import type { ReactNode} from "react";
import { createContext, useContext, useMemo } from "react";
import { LocalStorageMapRepository } from "./LocalStorageMapRepository";
import type { MapRepository } from "./MapRepository";

const MapRepositoryContext = createContext<MapRepository | null>(null);

export const MapRepositoryProvider = ({ children, repository }: { children: ReactNode; repository?: MapRepository }) => {
  const fallback = useMemo(() => new LocalStorageMapRepository(), []);
  return <MapRepositoryContext.Provider value={repository ?? fallback}>{children}</MapRepositoryContext.Provider>;
};

export const useMapRepository = () => {
  const repository = useContext(MapRepositoryContext);
  if (!repository) throw new Error("MapRepositoryProvider is missing");
  return repository;
};
