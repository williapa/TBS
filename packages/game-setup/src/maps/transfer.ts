import type { MapDocument, SaveMapInput } from "../contracts";
import {
  CURRENT_MAP_SCHEMA_VERSION,
  MAX_SERIALIZED_MAP_BYTES,
  MapSetupError,
} from "../contracts";
import { validateSaveMapInput } from "./validation";

export const serializedByteLength = (value: string): number =>
  new TextEncoder().encode(value).byteLength;

export const assertSerializedMapSize = (serialized: string): void => {
  const bytes = serializedByteLength(serialized);
  if (bytes > MAX_SERIALIZED_MAP_BYTES) {
    throw new MapSetupError(
      "map-too-large",
      `Map file is ${bytes.toLocaleString()} bytes; the limit is ${MAX_SERIALIZED_MAP_BYTES.toLocaleString()} bytes`,
    );
  }
};

export const exportMapDocument = (document: MapDocument): string => {
  const input = validateSaveMapInput(document, document.schemaVersion);
  const serialized = JSON.stringify({
    schemaVersion: CURRENT_MAP_SCHEMA_VERSION,
    ...input,
  }, null, 2);
  assertSerializedMapSize(serialized);
  return serialized;
};

export const importMapDocument = (serialized: string): SaveMapInput => {
  assertSerializedMapSize(serialized);
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new MapSetupError("invalid-map", "Map file is not valid JSON");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new MapSetupError("invalid-map", "Map file must contain an object");
  }
  const document = value as Readonly<Record<string, unknown>>;
  if (document.schemaVersion !== CURRENT_MAP_SCHEMA_VERSION) {
    throw new MapSetupError(
      "unsupported-version",
      `Unsupported map schema version ${String(document.schemaVersion)}`,
    );
  }
  return validateSaveMapInput(document, CURRENT_MAP_SCHEMA_VERSION);
};
