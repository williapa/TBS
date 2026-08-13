import {
  assertSerializedMapSize,
  createDefaultBattlefield,
  validateSaveMapInput,
} from "@TBS/game-setup";
import type {
  MapRepository,
  SavedMap,
  SaveMapInput} from "./MapRepository";
import {
  CURRENT_MAP_SCHEMA_VERSION,
  MapRepositoryError
} from "./MapRepository";

type StoredRepository = { repositoryVersion: 1; maps: Omit<SavedMap, "readOnly">[] };

const STORAGE_KEY = "TBS.maps.v1";
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const defaultMap = (): SavedMap => {
  const preset = createDefaultBattlefield();
  return { ...preset, id: "default-battlefield", readOnly: true };
};

const invalid = (message: string): never => { throw new MapRepositoryError("invalid-map", message); };

const parseSavedMap = (value: unknown): Omit<SavedMap, "readOnly"> => {
  assertSerializedMapSize(JSON.stringify(value));
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid("Saved map must be an object");
  const item = value as Record<string, unknown>;
  if (item.schemaVersion !== CURRENT_MAP_SCHEMA_VERSION) {
    throw new MapRepositoryError("unsupported-version", `Unsupported map schema version ${String(item.schemaVersion)}`);
  }
  const id = item.id;
  const name = item.name;
  if (typeof id !== "string" || !id) throw new MapRepositoryError("invalid-map", "Saved map ID is required");
  if (typeof name !== "string" || !name.trim()) throw new MapRepositoryError("invalid-map", "Saved map name is required");
  return {
    schemaVersion: CURRENT_MAP_SCHEMA_VERSION,
    id,
    ...validateSaveMapInput({ name, map: item.map }, CURRENT_MAP_SCHEMA_VERSION),
  };
};

export class LocalStorageMapRepository implements MapRepository {
  constructor(
    private readonly storage: Storage = window.localStorage,
    private readonly createId: () => string = () => globalThis.crypto?.randomUUID?.() ?? `map-${Date.now()}`
  ) {}

  private read(): StoredRepository {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (raw === null) return { repositoryVersion: 1, maps: [] };
    let value: unknown;
    try { value = JSON.parse(raw); } catch { invalid("Stored maps are not valid JSON"); }
    if (typeof value !== "object" || value === null || Array.isArray(value)) invalid("Stored map repository must be an object");
    const repository = value as Record<string, unknown>;
    if (repository.repositoryVersion !== 1) {
      throw new MapRepositoryError("unsupported-version", `Unsupported repository version ${String(repository.repositoryVersion)}`);
    }
    const storedMaps = repository.maps;
    if (!Array.isArray(storedMaps)) throw new MapRepositoryError("invalid-map", "Stored map repository must contain a map array");
    const maps = storedMaps.map(parseSavedMap);
    if (new Set(maps.map((map) => map.id)).size !== maps.length) invalid("Saved map IDs must be unique");
    return { repositoryVersion: 1, maps };
  }

  private write(repository: StoredRepository) {
    repository.maps.forEach((map) => assertSerializedMapSize(JSON.stringify(map)));
    this.storage.setItem(STORAGE_KEY, JSON.stringify(repository));
  }

  async list() {
    return [defaultMap(), ...this.read().maps.map((map) => ({ ...map, readOnly: false as const }))].map(clone);
  }

  async get(id: string) {
    return (await this.list()).find((map) => map.id === id);
  }

  async save(input: SaveMapInput) {
    const repository = this.read();
    const saved = parseSavedMap({ ...input, id: this.createId(), schemaVersion: CURRENT_MAP_SCHEMA_VERSION });
    if (saved.id === defaultMap().id || repository.maps.some((map) => map.id === saved.id)) invalid("Generated map ID already exists");
    repository.maps.push(saved);
    this.write(repository);
    return clone({ ...saved, readOnly: false });
  }

  async update(id: string, input: SaveMapInput) {
    if (id === defaultMap().id) throw new MapRepositoryError("read-only", "The bundled default map is read-only");
    const repository = this.read();
    const index = repository.maps.findIndex((map) => map.id === id);
    if (index < 0) throw new MapRepositoryError("map-not-found", "Map not found");
    const saved = parseSavedMap({ ...input, id, schemaVersion: CURRENT_MAP_SCHEMA_VERSION });
    repository.maps[index] = saved;
    this.write(repository);
    return clone({ ...saved, readOnly: false });
  }

  async delete(id: string) {
    if (id === defaultMap().id) throw new MapRepositoryError("read-only", "The bundled default map is read-only");
    const repository = this.read();
    const next = repository.maps.filter((map) => map.id !== id);
    if (next.length === repository.maps.length) throw new MapRepositoryError("map-not-found", "Map not found");
    this.write({ ...repository, maps: next });
  }
}
